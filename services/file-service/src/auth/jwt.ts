import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export type AuthContext = {
  /** Token subject (often service-account UUID). */
  subject: string;
  /** OAuth client id (azp / client_id). */
  clientId: string;
  roles: string[];
  raw: JWTPayload;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      requestId?: string;
      traceId?: string;
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks) {
    const url = new URL(
      `${config.keycloak.issuer.replace(/\/$/, "")}/protocol/openid-connect/certs`,
    );
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

function extractRoles(payload: JWTPayload): string[] {
  const realm = payload.realm_access as { roles?: string[] } | undefined;
  const fromRealm = realm?.roles ?? [];
  const claimRoles = payload.roles;
  const fromClaim = Array.isArray(claimRoles)
    ? claimRoles.filter((r): r is string => typeof r === "string")
    : [];

  const resourceAccess = payload.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;
  const fromResource = resourceAccess
    ? Object.values(resourceAccess).flatMap((r) => r.roles ?? [])
    : [];

  return [...new Set([...fromRealm, ...fromClaim, ...fromResource])];
}

function extractClientId(payload: JWTPayload): string | undefined {
  if (typeof payload.azp === "string" && payload.azp.length > 0) {
    return payload.azp;
  }
  if (typeof payload.client_id === "string" && payload.client_id.length > 0) {
    return payload.client_id;
  }
  // Keycloak client_credentials often sets preferred_username to service-account-<clientId>
  if (typeof payload.preferred_username === "string") {
    const m = /^service-account-(.+)$/.exec(payload.preferred_username);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  const verifyOpts: { issuer: string; audience?: string | string[] } = {
    issuer: config.keycloak.issuer,
  };
  if (config.keycloak.audience && config.keycloak.audience !== "*") {
    verifyOpts.audience = config.keycloak.audience;
  }
  const { payload } = await jwtVerify(token, getJwks(), verifyOpts);

  const subject = payload.sub;
  if (!subject) {
    throw new Error("Token missing sub");
  }

  const clientId = extractClientId(payload);
  if (!clientId) {
    throw new Error("Token missing client id (azp)");
  }

  if (
    config.keycloak.allowedClients.length > 0 &&
    !config.keycloak.allowedClients.includes(clientId)
  ) {
    throw new Error(`Client not allowlisted: ${clientId}`);
  }

  return {
    subject,
    clientId,
    roles: extractRoles(payload),
    raw: payload,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  verifyAccessToken(token)
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch((err) => {
      const message =
        err instanceof Error && err.message.startsWith("Client not allowlisted")
          ? err.message
          : "Invalid token";
      const status = message.startsWith("Client not allowlisted") ? 403 : 401;
      res.status(status).json({
        error: status === 403 ? "forbidden" : "unauthorized",
        message,
      });
    });
}
