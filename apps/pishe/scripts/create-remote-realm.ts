/**
 * Create or repair realm `pishe` on remote Keycloak using master admin.
 *
 * Uses only the master admin token (never pishe-bff) so bootstrap works
 * even when .env.local still has REPLACE_ placeholders.
 *
 * Usage: yarn workspace pishe kc:create-realm
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

function loadEnvLocal(): Record<string, string> {
  const path = resolve(__dirname, "../.env.local");
  const map: Record<string, string> = {};
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return map;
}

function secret(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

async function masterToken(base: string, user: string, pass: string): Promise<string> {
  const res = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "admin-cli",
      username: user,
      password: pass,
    }),
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? `Master login failed (${res.status})`);
  }
  return json.access_token;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function findClientUuid(
  base: string,
  token: string,
  realm: string,
  clientId: string,
): Promise<string> {
  const res = await fetch(
    `${base}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const list = (await res.json()) as Array<{ id: string }>;
  if (!list[0]?.id) throw new Error(`Client ${clientId} not found in realm ${realm}`);
  return list[0].id;
}

async function setClientSecret(
  base: string,
  token: string,
  realm: string,
  clientUuid: string,
  value: string,
) {
  const res = await fetch(
    `${base}/admin/realms/${realm}/clients/${clientUuid}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Failed to load client ${clientUuid}`);
  const client = (await res.json()) as Record<string, unknown>;
  client.secret = value;
  const put = await fetch(`${base}/admin/realms/${realm}/clients/${clientUuid}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(client),
  });
  if (!put.ok) {
    throw new Error(`Failed to set secret for client ${String(client.clientId)}: ${put.status}`);
  }
}

const BFF_REALM_MANAGEMENT_ROLES = [
  "manage-users",
  "view-users",
  "query-users",
  "view-realm",
  "manage-realm",
] as const;

/** Allow custom attributes (pre_registration, mobile) under Keycloak user profile. */
async function ensureUserProfile(base: string, token: string, realm: string) {
  const url = `${base}/admin/realms/${realm}/users/profile`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Failed to load user profile (${res.status})`);
  }
  const profile = (await res.json()) as {
    unmanagedAttributePolicy?: string;
    attributes?: Array<Record<string, unknown>>;
  };
  profile.unmanagedAttributePolicy = "ENABLED";
  const attrs = profile.attributes ?? [];
  const names = new Set(attrs.map((a) => String(a.name)));
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
    }
  }
  profile.attributes = attrs;
  const put = await fetch(url, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(profile),
  });
  if (!put.ok) {
    throw new Error(`Failed to update user profile (${put.status})`);
  }
}

async function grantBffRoles(base: string, token: string, realm: string) {
  const bffId = await findClientUuid(base, token, realm, "pishe-bff");
  const saRes = await fetch(
    `${base}/admin/realms/${realm}/clients/${bffId}/service-account-user`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!saRes.ok) {
    throw new Error("pishe-bff service account missing — enable serviceAccounts on the client");
  }
  const saUser = (await saRes.json()) as { id: string };

  const rmId = await findClientUuid(base, token, realm, "realm-management");
  const rolesRes = await fetch(`${base}/admin/realms/${realm}/clients/${rmId}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const allRoles = (await rolesRes.json()) as Array<{ id: string; name: string }>;
  const toAssign = allRoles.filter((r) =>
    (BFF_REALM_MANAGEMENT_ROLES as readonly string[]).includes(r.name),
  );
  if (toAssign.length === 0) throw new Error("realm-management roles not found");

  const rolePayload = toAssign.map((r) => ({ id: r.id, name: r.name }));

  const mapRes = await fetch(
    `${base}/admin/realms/${realm}/users/${saUser.id}/role-mappings/clients/${rmId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(rolePayload),
    },
  );
  if (!mapRes.ok && mapRes.status !== 409) {
    throw new Error(`Failed to assign SA roles: ${mapRes.status}`);
  }

  // fullScopeAllowed=false → SA roles must also be on the client scope or they
  // never appear in the access token and Admin API calls return 403.
  const scopeRes = await fetch(
    `${base}/admin/realms/${realm}/clients/${bffId}/scope-mappings/clients/${rmId}`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(rolePayload),
    },
  );
  if (!scopeRes.ok && scopeRes.status !== 409) {
    throw new Error(`Failed to assign BFF client scope-mappings: ${scopeRes.status}`);
  }
}

async function ensureManager(
  base: string,
  token: string,
  realm: string,
  password: string,
): Promise<{ username: string; password: string; created: boolean }> {
  const username = "flamingo-manager";
  const search = await fetch(
    `${base}/admin/realms/${realm}/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  let users = (await search.json()) as Array<{ id: string }>;
  let created = false;
  let userId = users[0]?.id;

  if (!userId) {
    const create = await fetch(`${base}/admin/realms/${realm}/users`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({
        username,
        enabled: true,
        email: "flamingo-manager@pishe.local",
        emailVerified: true,
        firstName: "Flamingo",
        lastName: "Manager",
        requiredActions: [],
        attributes: { pre_registration: ["false"] },
      }),
    });
    if (!create.ok) throw new Error(`Create manager failed: ${create.status}`);
    created = true;
    userId =
      create.headers.get("Location")?.split("/").pop() ??
      (
        (await (
          await fetch(
            `${base}/admin/realms/${realm}/users?username=${encodeURIComponent(username)}&exact=true`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
        ).json()) as Array<{ id: string }>
      )[0]?.id;
  }

  if (!userId) throw new Error("Manager user id missing");

  const profile = await fetch(`${base}/admin/realms/${realm}/users/${userId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({
      username,
      enabled: true,
      email: "flamingo-manager@pishe.local",
      emailVerified: true,
      firstName: "Flamingo",
      lastName: "Manager",
      requiredActions: [],
      attributes: { pre_registration: ["false"] },
    }),
  });
  if (!profile.ok) throw new Error(`Update manager profile failed: ${profile.status}`);

  const pwd = await fetch(`${base}/admin/realms/${realm}/users/${userId}/reset-password`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ type: "password", value: password, temporary: false }),
  });
  if (!pwd.ok) throw new Error(`Set manager password failed: ${pwd.status}`);

  const roleRes = await fetch(`${base}/admin/realms/${realm}/roles/manager`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (roleRes.ok) {
    const role = (await roleRes.json()) as { id: string; name: string };
    await fetch(`${base}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    });
  }

  return { username, password, created };
}

function writeEnvLocal(
  existing: Record<string, string>,
  updates: Record<string, string>,
) {
  const path = resolve(__dirname, "../.env.local");
  const merged = { ...existing, ...updates };
  const order = [
    "KEYCLOAK_BASE_URL",
    "KEYCLOAK_REALM",
    "KEYCLOAK_APP_CLIENT_ID",
    "KEYCLOAK_APP_CLIENT_SECRET",
    "KEYCLOAK_BFF_CLIENT_ID",
    "KEYCLOAK_BFF_CLIENT_SECRET",
    "KEYCLOAK_ADMIN_USER",
    "KEYCLOAK_ADMIN_PASSWORD",
    "PISHE_MANAGER_PASSWORD",
    "APP_ENV",
    "NEXT_PUBLIC_APP_ENV",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_URL",
  ];
  const lines: string[] = [
    "# Generated/updated by yarn kc:create-realm — do not commit",
    "",
  ];
  const seen = new Set<string>();
  for (const key of order) {
    if (merged[key] === undefined) continue;
    lines.push(`${key}=${merged[key]}`);
    seen.add(key);
  }
  for (const [key, value] of Object.entries(merged)) {
    if (seen.has(key)) continue;
    lines.push(`${key}=${value}`);
  }
  writeFileSync(path, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const existing = loadEnvLocal();

  const base = (process.env.KEYCLOAK_BASE_URL ?? "https://sso.abysso.ir").replace(/\/$/, "");
  const adminUser = process.env.KEYCLOAK_ADMIN_USER;
  const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD;
  if (!adminUser || !adminPass) {
    throw new Error(
      "Set KEYCLOAK_ADMIN_USER and KEYCLOAK_ADMIN_PASSWORD in .env.local (Keycloak master admin).",
    );
  }

  const appSecret = secret();
  const bffSecret = secret();
  const managerPassword = process.env.PISHE_MANAGER_PASSWORD || "FlamingoManager1";

  const realmPath = resolve(__dirname, "../../../platform/identity/realms/pishe-realm.json");
  const realm = JSON.parse(readFileSync(realmPath, "utf8")) as {
    realm: string;
    clients?: Array<{ clientId?: string; secret?: string; [k: string]: unknown }>;
    [k: string]: unknown;
  };
  delete realm._comment_pre_registration;
  delete realm._comment_secrets;
  delete realm._comment_permissions;
  if (Array.isArray(realm.clients)) {
    for (const client of realm.clients) {
      if (client.clientId === "pishe-app") client.secret = appSecret;
      if (client.clientId === "pishe-bff") client.secret = bffSecret;
    }
  }

  const token = await masterToken(base, adminUser, adminPass);

  console.log(`[kc:create-realm] checking ${base}/realms/pishe …`);
  const probe = await fetch(`${base}/realms/pishe/.well-known/openid-configuration`);
  if (probe.ok) {
    console.log("[kc:create-realm] realm exists — resetting client secrets…");
    const appId = await findClientUuid(base, token, "pishe", "pishe-app");
    const bffId = await findClientUuid(base, token, "pishe", "pishe-bff");
    await setClientSecret(base, token, "pishe", appId, appSecret);
    await setClientSecret(base, token, "pishe", bffId, bffSecret);
  } else {
    const createRes = await fetch(`${base}/admin/realms`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(realm),
    });
    if (!createRes.ok) {
      throw new Error(`Create realm failed (${createRes.status}): ${await createRes.text()}`);
    }
    console.log("[kc:create-realm] realm pishe created.");
  }

  console.log("[kc:create-realm] ensuring user profile attributes…");
  await ensureUserProfile(base, token, "pishe");

  console.log("[kc:create-realm] granting pishe-bff Admin API roles…");
  await grantBffRoles(base, token, "pishe");

  console.log("[kc:create-realm] ensuring flamingo-manager…");
  const manager = await ensureManager(base, token, "pishe", managerPassword);

  writeEnvLocal(existing, {
    KEYCLOAK_BASE_URL: base,
    KEYCLOAK_REALM: "pishe",
    KEYCLOAK_APP_CLIENT_ID: "pishe-app",
    KEYCLOAK_APP_CLIENT_SECRET: appSecret,
    KEYCLOAK_BFF_CLIENT_ID: "pishe-bff",
    KEYCLOAK_BFF_CLIENT_SECRET: bffSecret,
    KEYCLOAK_ADMIN_USER: adminUser,
    KEYCLOAK_ADMIN_PASSWORD: adminPass,
    PISHE_MANAGER_PASSWORD: managerPassword,
    APP_ENV: existing.APP_ENV ?? "development",
    NEXT_PUBLIC_APP_ENV: existing.NEXT_PUBLIC_APP_ENV ?? "development",
    NEXT_PUBLIC_APP_NAME: existing.NEXT_PUBLIC_APP_NAME ?? "Pishe",
    NEXT_PUBLIC_APP_URL: existing.NEXT_PUBLIC_APP_URL ?? "http://localhost:3010",
  });

  console.log("\n[kc:create-realm] wrote secrets to apps/pishe/.env.local");
  console.log("[kc:create-realm] manager", JSON.stringify(manager));
  console.log("\nRestart the app: yarn workspace pishe dev");
  console.log(`Login with: ${manager.username} / ${manager.password}\n`);
}

main().catch((error) => {
  console.error("[kc:create-realm] failed", error);
  process.exit(1);
});
