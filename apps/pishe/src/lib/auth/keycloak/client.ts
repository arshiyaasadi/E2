import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  keycloakAdminBase,
  keycloakIssuer,
  serverEnv,
} from "@/config/env.server";
import { generateTempPassword, normalizeIranMobile } from "@/lib/auth/mobile";
import { logPreRegistration } from "@/lib/obs/log";

export class KeycloakAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type TokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  payload: JWTPayload;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${keycloakIssuer()}/protocol/openid-connect/certs`),
    );
  }
  return jwks;
}

function mapFetchError(error: unknown): never {
  if (error instanceof KeycloakAuthError) throw error;
  console.error("[pishe-auth] keycloak unreachable", error);
  throw new KeycloakAuthError(
    "SERVICE_UNAVAILABLE",
    "Identity service is unavailable",
  );
}

/** Gateway/proxy failures often return plain text (e.g. Traefik "404 page not found"). */
async function readJsonBody<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const unavailable =
      res.status === 404 ||
      res.status === 502 ||
      res.status === 503 ||
      res.status === 504 ||
      /page not found/i.test(text);
    throw new KeycloakAuthError(
      unavailable ? "SERVICE_UNAVAILABLE" : "KEYCLOAK_ERROR",
      unavailable
        ? `Identity service is unavailable (HTTP ${res.status})`
        : `Unexpected identity response (HTTP ${res.status})`,
    );
  }
}

async function tokenRequest(body: URLSearchParams): Promise<TokenBundle> {
  let res: Response;
  try {
    res = await fetch(`${keycloakIssuer()}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    mapFetchError(error);
  }

  const json = await readJsonBody<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  }>(res);

  if (!res.ok || !json.access_token) {
    throw new KeycloakAuthError(
      res.status === 401 || json.error === "invalid_grant"
        ? "UNAUTHORIZED"
        : res.status === 404 || res.status >= 500
          ? "SERVICE_UNAVAILABLE"
          : "KEYCLOAK_ERROR",
      json.error_description ?? json.error ?? "Token request failed",
    );
  }

  try {
    const { payload } = await jwtVerify(json.access_token, getJwks(), {
      issuer: keycloakIssuer(),
    });
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresIn: json.expires_in ?? 300,
      payload,
    };
  } catch (error) {
    mapFetchError(error);
  }
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: keycloakIssuer(),
    });
    return payload;
  } catch {
    return null;
  }
}

function sessionFromPayload(payload: JWTPayload) {
  const username =
    String(payload.preferred_username ?? payload.username ?? "") ||
    String(payload.sub);
  const given = payload.given_name ? String(payload.given_name) : "";
  const family = payload.family_name ? String(payload.family_name) : "";
  const name = payload.name ? String(payload.name) : `${given} ${family}`.trim();
  return {
    sub: String(payload.sub),
    username,
    displayName: name || username,
    firstName: given,
    lastName: family,
    mobile: username,
  };
}

export type SessionUser = ReturnType<typeof sessionFromPayload>;

export function sessionUserFromPayload(payload: JWTPayload): SessionUser {
  return sessionFromPayload(payload);
}

export async function getAppToken(
  username: string,
  password: string,
): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: serverEnv.KEYCLOAK_APP_CLIENT_ID,
    client_secret: serverEnv.KEYCLOAK_APP_CLIENT_SECRET,
    username,
    password,
    scope: "openid profile offline_access",
  });
  return tokenRequest(body);
}

export async function refreshAppToken(refreshToken: string): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: serverEnv.KEYCLOAK_APP_CLIENT_ID,
    client_secret: serverEnv.KEYCLOAK_APP_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  return tokenRequest(body);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    await fetch(`${keycloakIssuer()}/protocol/openid-connect/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: serverEnv.KEYCLOAK_APP_CLIENT_ID,
        client_secret: serverEnv.KEYCLOAK_APP_CLIENT_SECRET,
        token: refreshToken,
        token_type_hint: "refresh_token",
      }),
    });
  } catch (error) {
    console.warn("[pishe-auth] revoke failed", error);
  }
}

export async function checkKeycloakHealth(): Promise<{
  ok: boolean;
  issuer: string;
  detail?: string;
}> {
  const issuer = keycloakIssuer();
  try {
    const res = await fetch(`${issuer}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, issuer, detail: `HTTP ${res.status}` };
    }
    return { ok: true, issuer };
  } catch (error) {
    return {
      ok: false,
      issuer,
      detail: error instanceof Error ? error.message : "unreachable",
    };
  }
}

export async function getAdminToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: serverEnv.KEYCLOAK_BFF_CLIENT_ID,
    client_secret: serverEnv.KEYCLOAK_BFF_CLIENT_SECRET,
  });

  let res: Response;
  try {
    res = await fetch(`${keycloakIssuer()}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    mapFetchError(error);
  }

  const json = await readJsonBody<{
    access_token?: string;
    error?: string;
    error_description?: string;
  }>(res);

  if (!res.ok || !json.access_token) {
    throw new KeycloakAuthError(
      res.status === 404 || res.status >= 500
        ? "SERVICE_UNAVAILABLE"
        : "KEYCLOAK_ERROR",
      json.error_description ?? "Failed to obtain admin token",
    );
  }

  return json.access_token;
}

export type KeycloakUserRepresentation = {
  id: string;
  username?: string;
  enabled?: boolean;
  attributes?: Record<string, string[]>;
};

async function findUsersByUsernameExact(
  adminToken: string,
  username: string,
): Promise<KeycloakUserRepresentation[]> {
  const url = new URL(`${keycloakAdminBase()}/users`);
  url.searchParams.set("username", username);
  url.searchParams.set("exact", "true");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!res.ok) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      `Failed to look up user (HTTP ${res.status})`,
    );
  }

  return (await res.json()) as KeycloakUserRepresentation[];
}

async function findUserIdByUsername(
  adminToken: string,
  username: string,
): Promise<string | null> {
  const users = await findUsersByUsernameExact(adminToken, username);
  return users[0]?.id ?? null;
}

/** Admin lookup used before login to enforce pre_registration gate. */
export async function findUserByUsername(
  username: string,
): Promise<KeycloakUserRepresentation | null> {
  const adminToken = await getAdminToken();
  const users = await findUsersByUsernameExact(adminToken, username);
  const brief = users[0];
  if (!brief?.id) return null;

  // Search results often omit attributes; fetch the full representation.
  const res = await fetch(`${keycloakAdminBase()}/users/${brief.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      `Failed to load user (HTTP ${res.status})`,
    );
  }
  return (await res.json()) as KeycloakUserRepresentation;
}

export function isPreRegistrationPending(
  user: KeycloakUserRepresentation | null,
): boolean {
  if (!user?.attributes?.pre_registration) return false;
  const value = user.attributes.pre_registration[0];
  return value === "true" || value === "True" || value === "1";
}

async function assignRealmRole(
  adminToken: string,
  userId: string,
  roleName: string,
) {
  const roleRes = await fetch(`${keycloakAdminBase()}/roles/${roleName}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!roleRes.ok) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", `Role ${roleName} not found`);
  }
  const role = (await roleRes.json()) as { id: string; name: string };

  const mapRes = await fetch(
    `${keycloakAdminBase()}/users/${userId}/role-mappings/realm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    },
  );

  // 204/200 OK; 409 already assigned is fine
  if (!mapRes.ok && mapRes.status !== 409) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Failed to assign realm role");
  }
}

async function setUserPassword(
  adminToken: string,
  userId: string,
  password: string,
) {
  const res = await fetch(
    `${keycloakAdminBase()}/users/${userId}/reset-password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password",
        value: password,
        temporary: false,
      }),
    },
  );

  if (!res.ok) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Failed to set user password");
  }
}

async function ensurePreRegistrationAttributesAllowed(adminToken: string) {
  const url = `${keycloakAdminBase()}/users/profile`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!res.ok) return;

  const profile = (await res.json()) as {
    unmanagedAttributePolicy?: string;
    attributes?: Array<Record<string, unknown>>;
  };
  const attrs = profile.attributes ?? [];
  const names = new Set(attrs.map((a) => String(a.name)));
  let changed = profile.unmanagedAttributePolicy !== "ENABLED";
  profile.unmanagedAttributePolicy = "ENABLED";
  for (const [name, displayName] of [
    ["pre_registration", "Pre-registration"],
    ["mobile", "Mobile"],
  ] as const) {
    if (!names.has(name)) {
      attrs.push({
        name,
        displayName,
        permissions: { view: ["admin"], edit: ["admin"] },
        multivalued: false,
      });
      changed = true;
    }
  }
  if (!changed) return;
  profile.attributes = attrs;
  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
}

export async function createPreRegistrationUser(input: {
  firstName: string;
  lastName: string;
  mobile: string;
}): Promise<{ username: string; userId: string }> {
  const username = normalizeIranMobile(input.mobile);
  if (!username) {
    throw new KeycloakAuthError("VALIDATION_ERROR", "Invalid mobile number");
  }

  const adminToken = await getAdminToken();
  await ensurePreRegistrationAttributesAllowed(adminToken);

  const existing = await findUserIdByUsername(adminToken, username);
  if (existing) {
    throw new KeycloakAuthError("CONFLICT", "User already exists");
  }

  const attributes = {
    pre_registration: ["true"],
    mobile: [username],
  };

  let createRes: Response;
  try {
    createRes = await fetch(`${keycloakAdminBase()}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        enabled: true,
        email: `${username}@pishe.local`,
        emailVerified: true,
        firstName: input.firstName,
        lastName: input.lastName,
        requiredActions: [],
        attributes,
      }),
    });
  } catch (error) {
    mapFetchError(error);
  }

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new KeycloakAuthError("KEYCLOAK_ERROR", text || "Failed to create user");
  }

  const userId =
    createRes.headers.get("Location")?.split("/").pop() ??
    (await findUserIdByUsername(adminToken, username));

  if (!userId) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "User created but id missing");
  }

  // Re-PUT attributes: Keycloak user profile may drop unknown attrs on create.
  await ensureUserReadyForLogin(adminToken, userId, {
    username,
    email: `${username}@pishe.local`,
    firstName: input.firstName,
    lastName: input.lastName,
    attributes,
  });

  // No password: user cannot login until an operator sets one and clears the flag.
  await assignRealmRole(adminToken, userId, "shop-owner");

  logPreRegistration({
    userId,
    username,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  return { username, userId };
}

async function ensureUserReadyForLogin(
  adminToken: string,
  userId: string,
  profile: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    attributes?: Record<string, string[]>;
  },
) {
  // Keycloak VERIFY_PROFILE blocks ROPC with "Account is not fully set up"
  // when email is missing even if requiredActions is empty.
  const res = await fetch(`${keycloakAdminBase()}/users/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: profile.username,
      enabled: true,
      email: profile.email,
      emailVerified: true,
      firstName: profile.firstName,
      lastName: profile.lastName,
      requiredActions: [],
      attributes: profile.attributes,
    }),
  });

  if (!res.ok) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Failed to update user profile");
  }
}

export async function ensureManagerUser(opts?: {
  password?: string;
}): Promise<{ username: string; password: string; created: boolean }> {
  const username = "flamingo-manager";
  const password = opts?.password || generateTempPassword(16);
  const adminToken = await getAdminToken();
  let userId = await findUserIdByUsername(adminToken, username);
  let created = false;

  if (!userId) {
    const createRes = await fetch(`${keycloakAdminBase()}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        enabled: true,
        email: "flamingo-manager@pishe.local",
        emailVerified: true,
        firstName: "Flamingo",
        lastName: "Manager",
        requiredActions: [],
        attributes: {
          pre_registration: ["false"],
        },
      }),
    });

    if (!createRes.ok) {
      throw new KeycloakAuthError(
        "KEYCLOAK_ERROR",
        "Failed to create manager user",
      );
    }

    userId =
      createRes.headers.get("Location")?.split("/").pop() ??
      (await findUserIdByUsername(adminToken, username));
    created = true;
  }

  if (!userId) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "Manager user id missing");
  }

  await ensureUserReadyForLogin(adminToken, userId, {
    username,
    email: "flamingo-manager@pishe.local",
    firstName: "Flamingo",
    lastName: "Manager",
    attributes: { pre_registration: ["false"] },
  });
  await setUserPassword(adminToken, userId, password);
  await assignRealmRole(adminToken, userId, "manager");

  return { username, password, created };
}

/** Grant Admin API roles to pishe-bff service account (needs master admin). */
export async function grantBffServiceAccountRoles(opts: {
  masterUsername: string;
  masterPassword: string;
  baseUrl?: string;
  realm?: string;
}): Promise<void> {
  const base = (opts.baseUrl ?? serverEnv.KEYCLOAK_BASE_URL).replace(/\/$/, "");
  const realm = opts.realm ?? serverEnv.KEYCLOAK_REALM;

  const tokenRes = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: opts.masterUsername,
      password: opts.masterPassword,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      tokenJson.error_description ?? "Master admin login failed",
    );
  }

  const adminToken = tokenJson.access_token;
  const headers = { Authorization: `Bearer ${adminToken}` };

  async function clientIdByClientId(clientId: string): Promise<string> {
    const res = await fetch(
      `${base}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`,
      { headers },
    );
    const list = (await res.json()) as Array<{ id: string }>;
    if (!list[0]?.id) {
      throw new KeycloakAuthError("KEYCLOAK_ERROR", `Client ${clientId} not found`);
    }
    return list[0].id;
  }

  const bffId = await clientIdByClientId(serverEnv.KEYCLOAK_BFF_CLIENT_ID);
  const saRes = await fetch(
    `${base}/admin/realms/${realm}/clients/${bffId}/service-account-user`,
    { headers },
  );
  if (!saRes.ok) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      "Service account user not found — enable service accounts on pishe-bff",
    );
  }
  const saUser = (await saRes.json()) as { id: string };

  const rmId = await clientIdByClientId("realm-management");
  const rolesRes = await fetch(
    `${base}/admin/realms/${realm}/clients/${rmId}/roles`,
    { headers },
  );
  const allRoles = (await rolesRes.json()) as Array<{ id: string; name: string }>;
  const needed = [
    "manage-users",
    "view-users",
    "query-users",
    "view-realm",
    "manage-realm",
  ];
  const toAssign = allRoles.filter((r) => needed.includes(r.name));
  if (toAssign.length === 0) {
    throw new KeycloakAuthError("KEYCLOAK_ERROR", "realm-management roles missing");
  }

  const rolePayload = toAssign.map((r) => ({ id: r.id, name: r.name }));
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  const mapRes = await fetch(
    `${base}/admin/realms/${realm}/users/${saUser.id}/role-mappings/clients/${rmId}`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(rolePayload),
    },
  );

  if (!mapRes.ok && mapRes.status !== 409) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      "Failed to assign realm-management roles to pishe-bff",
    );
  }

  const scopeRes = await fetch(
    `${base}/admin/realms/${realm}/clients/${bffId}/scope-mappings/clients/${rmId}`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(rolePayload),
    },
  );

  if (!scopeRes.ok && scopeRes.status !== 409) {
    throw new KeycloakAuthError(
      "KEYCLOAK_ERROR",
      "Failed to assign pishe-bff client scope-mappings",
    );
  }
}
