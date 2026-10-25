import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export type AuthContext = {
  subject: string;
  roles: string[];
  storeId?: string;
  raw: JWTPayload;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
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
  return [...new Set([...fromRealm, ...fromClaim])];
}

function extractStoreId(payload: JWTPayload): string | undefined {
  const single = payload.store_id;
  if (typeof single === "string" && single.length > 0) return single;
  const list = payload.store_ids;
  if (Array.isArray(list) && typeof list[0] === "string") return list[0];
  return undefined;
}

export async function verifyAccessToken(token: string): Promise<AuthContext> {
  const verifyOpts: { issuer: string; audience?: string } = {
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

  return {
    subject,
    roles: extractRoles(payload),
    storeId: extractStoreId(payload),
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
    .catch(() => {
      res.status(401).json({ error: "unauthorized", message: "Invalid token" });
    });
}
