import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { serverEnv } from "@/config/env.server";
import { type AdminRole, isAdminRole } from "@/config/roles";

const CLIENT_ID = () => serverEnv.KEYCLOAK_CLIENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`),
    );
  }
  return jwks;
}

export type KeycloakTokenResult = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  payload: JWTPayload;
  sub: string;
  email: string;
  preferredUsername: string | null;
  fullName: string | null;
  role: AdminRole;
};

function mapRoles(payload: JWTPayload): string[] {
  const resourceAccess = payload.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;
  const clientRoles = resourceAccess?.[CLIENT_ID()]?.roles ?? [];
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  const flatRealm =
    (payload["realm_access.roles"] as string[] | undefined) ?? [];
  return [
    ...clientRoles,
    ...(realmAccess?.roles ?? []),
    ...(Array.isArray(flatRealm) ? flatRealm : []),
  ];
}

/** Map Keycloak realm (or legacy client) roles → local admin role names. */
export function resolveAdminRoleFromClaims(payload: JWTPayload): AdminRole | null {
  const roles = mapRoles(payload);
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("ecommerce_admin")) return "admin";
  for (const candidate of ["super_admin", "admin", "editor"] as const) {
    if (roles.includes(candidate)) return candidate;
  }
  return null;
}

export function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createOidcState(): string {
  return base64Url(randomBytes(24));
}

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(
    `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
  );
  url.searchParams.set("client_id", serverEnv.KEYCLOAK_CLIENT_ID);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email offline_access");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function buildLogoutUrl(opts: {
  postLogoutRedirectUri: string;
  idTokenHint?: string | null;
}): string {
  const url = new URL(
    `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
  );
  url.searchParams.set("client_id", serverEnv.KEYCLOAK_CLIENT_ID);
  url.searchParams.set("post_logout_redirect_uri", opts.postLogoutRedirectUri);
  if (opts.idTokenHint) {
    url.searchParams.set("id_token_hint", opts.idTokenHint);
  }
  return url.toString();
}

async function parseTokenResponse(json: {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
}): Promise<KeycloakTokenResult> {
  if (!json.access_token) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Missing access_token");
  }

  const { payload } = await jwtVerify(json.access_token, getJwks(), {
    issuer: serverEnv.KEYCLOAK_ISSUER,
  });

  const azp = payload.azp ? String(payload.azp) : null;
  if (azp && azp !== serverEnv.KEYCLOAK_CLIENT_ID) {
    throw new KeycloakAuthError("FORBIDDEN", "Token client mismatch");
  }

  const sub = payload.sub ? String(payload.sub) : "";
  if (!sub) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Missing subject");
  }

  const preferred =
    typeof payload.preferred_username === "string"
      ? payload.preferred_username
      : null;
  const emailRaw =
    (payload.email ? String(payload.email) : null) ||
    (preferred?.includes("@") ? preferred : null);
  if (!emailRaw) {
    throw new KeycloakAuthError("FORBIDDEN", "Keycloak user missing email");
  }

  const roleFromClaims = resolveAdminRoleFromClaims(payload);
  if (!roleFromClaims || !isAdminRole(roleFromClaims)) {
    throw new KeycloakAuthError("FORBIDDEN", "Insufficient Keycloak role");
  }

  const given = payload.given_name ? String(payload.given_name) : "";
  const family = payload.family_name ? String(payload.family_name) : "";
  const name = payload.name ? String(payload.name) : "";
  const fullName =
    name || [given, family].filter(Boolean).join(" ").trim() || null;

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    idToken: json.id_token ?? null,
    payload,
    sub,
    email: emailRaw.toLowerCase(),
    preferredUsername: preferred,
    fullName,
    role: roleFromClaims,
  };
}

export async function exchangeAuthorizationCode(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<KeycloakTokenResult> {
  const tokenUrl = `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: serverEnv.KEYCLOAK_CLIENT_ID,
    client_secret: serverEnv.KEYCLOAK_CLIENT_SECRET,
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new KeycloakAuthError(
      res.status === 401 ? "INVALID_CREDENTIALS" : "KEYCLOAK_ERROR",
      text || `Keycloak token request failed (${res.status})`,
    );
  }

  return parseTokenResponse(
    (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
    },
  );
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<KeycloakTokenResult> {
  const tokenUrl = `${serverEnv.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: serverEnv.KEYCLOAK_CLIENT_ID,
    client_secret: serverEnv.KEYCLOAK_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new KeycloakAuthError(
      "INVALID_CREDENTIALS",
      text || `Keycloak refresh failed (${res.status})`,
    );
  }

  return parseTokenResponse(
    (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      id_token?: string;
    },
  );
}

export class KeycloakAuthError extends Error {
  code: "INVALID_CREDENTIALS" | "FORBIDDEN" | "KEYCLOAK_ERROR";

  constructor(
    code: "INVALID_CREDENTIALS" | "FORBIDDEN" | "KEYCLOAK_ERROR",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "KeycloakAuthError";
  }
}
