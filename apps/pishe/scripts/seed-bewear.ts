/**
 * Seed BeWear business + thin Profiles + Keycloak users (realm pishe when reachable).
 * Usernames (proper casing): Arshiya, Amirhossein, Mahsa, Armin.
 *
 * Usage: yarn workspace pishe seed:bewear
 * Requires DATABASE_URL and KEYCLOAK_* in apps/pishe/.env.local
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

function loadEnvLocal() {
  const path = resolve(__dirname, "../.env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function genPassword(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString("base64url")}`;
}

type SeedUser = {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  isSuperAdmin?: boolean;
  role?: "MANAGER" | "ASSISTANT";
};

async function ensureKeycloakUser(input: {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ userId: string; created: boolean; synced: boolean; error?: string }> {
  try {
    const { getAdminToken, KeycloakAuthError } = await import(
      "../src/lib/auth/keycloak/client"
    );
    const { keycloakAdminBase } = await import("../src/config/env.server");

    const adminToken = await getAdminToken();
    const headers = {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    };

    const searchUrl = new URL(`${keycloakAdminBase()}/users`);
    searchUrl.searchParams.set("username", input.username);
    searchUrl.searchParams.set("exact", "true");
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!searchRes.ok) {
      throw new KeycloakAuthError(
        "KEYCLOAK_ERROR",
        `Lookup failed HTTP ${searchRes.status}`,
      );
    }
    const found = (await searchRes.json()) as Array<{ id: string }>;
    let userId = found[0]?.id ?? null;
    let created = false;

    if (!userId) {
      const createRes = await fetch(`${keycloakAdminBase()}/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          username: input.username,
          enabled: true,
          email: `${input.username}@pishe.local`,
          emailVerified: true,
          firstName: input.firstName,
          lastName: input.lastName,
          requiredActions: [],
          attributes: { pre_registration: ["false"] },
        }),
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new KeycloakAuthError(
          "KEYCLOAK_ERROR",
          text || `Create failed HTTP ${createRes.status}`,
        );
      }
      userId =
        createRes.headers.get("Location")?.split("/").pop() ??
        (
          (await (
            await fetch(searchUrl, {
              headers: { Authorization: `Bearer ${adminToken}` },
            })
          ).json()) as Array<{ id: string }>
        )[0]?.id ??
        null;
      created = true;
    }

    if (!userId) {
      throw new KeycloakAuthError("KEYCLOAK_ERROR", "User id missing");
    }

    await fetch(`${keycloakAdminBase()}/users/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        username: input.username,
        enabled: true,
        email: `${input.username}@pishe.local`,
        emailVerified: true,
        firstName: input.firstName,
        lastName: input.lastName,
        requiredActions: [],
        attributes: { pre_registration: ["false"] },
      }),
    });

    const pwRes = await fetch(
      `${keycloakAdminBase()}/users/${userId}/reset-password`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          type: "password",
          value: input.password,
          temporary: false,
        }),
      },
    );
    if (!pwRes.ok) {
      throw new KeycloakAuthError("KEYCLOAK_ERROR", "Failed to set password");
    }

    return { userId, created, synced: true };
  } catch (error) {
    return {
      userId: `local-${input.username}`,
      created: false,
      synced: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const { PrismaClient } = await import("@prisma/client");
  const { randomInt } = await import("node:crypto");
  const prisma = new PrismaClient();

  async function allocateUniqueInviteCode() {
    for (let i = 0; i < 12; i++) {
      const code = String(randomInt(10_000_000, 100_000_000));
      const existing = await prisma.profile.findUnique({
        where: { inviteCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new Error("Failed to allocate invite code");
  }

  async function allocateUniqueBusinessCode() {
    for (let i = 0; i < 12; i++) {
      const code = String(randomInt(100_000, 1_000_000));
      const existing = await prisma.business.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new Error("Failed to allocate business code");
  }

  const arshiyaPassword =
    process.env.PISHE_ARSHIYA_PASSWORD || genPassword("Arshiya");
  const memberPassword =
    process.env.PISHE_MEMBER_PASSWORD || genPassword("Member");

  /** Proper-cased login names (Keycloak username + seed placeholder). */
  const users: Array<SeedUser & { legacySeedSubs?: string[] }> = [
    {
      username: "Arshiya",
      firstName: "Arshiya",
      lastName: "Asadi",
      password: arshiyaPassword,
      isSuperAdmin: true,
      role: "MANAGER",
      legacySeedSubs: ["seed:ArshiyA", "seed:Arshiya"],
    },
    {
      username: "Amirhossein",
      firstName: "Amirhossein",
      lastName: "Member",
      password: memberPassword,
      role: "ASSISTANT",
      legacySeedSubs: ["seed:amirhossein", "seed:Amirhossein", "seed:AmirHossein"],
    },
    {
      username: "Mahsa",
      firstName: "Mahsa",
      lastName: "Member",
      password: memberPassword,
      role: "ASSISTANT",
      legacySeedSubs: ["seed:mahsa", "seed:Mahsa"],
    },
    {
      username: "Armin",
      firstName: "Armin",
      lastName: "Member",
      password: memberPassword,
      role: "ASSISTANT",
      legacySeedSubs: ["seed:armin", "seed:Armin"],
    },
  ];

  const credentialRows: Array<Record<string, unknown>> = [];
  const profileByUsername = new Map<
    string,
    { id: string; inviteCode: string; keycloakSub: string }
  >();

  for (const u of users) {
    const kc = await ensureKeycloakUser({
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      password: u.password,
    });

    const keycloakSub = kc.synced ? kc.userId : `seed:${u.username}`;
    let profile = await prisma.profile.findUnique({ where: { keycloakSub } });

    // Migrate legacy seed placeholders / old casing onto the canonical sub.
    if (!profile) {
      for (const legacy of u.legacySeedSubs ?? []) {
        const old = await prisma.profile.findUnique({
          where: { keycloakSub: legacy },
        });
        if (old) {
          profile = await prisma.profile.update({
            where: { id: old.id },
            data: {
              keycloakSub,
              displayName: `${u.firstName} ${u.lastName}`.trim(),
              isSuperAdmin: Boolean(u.isSuperAdmin) || old.isSuperAdmin,
            },
          });
          break;
        }
      }
    }

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          keycloakSub,
          inviteCode: await allocateUniqueInviteCode(),
          displayName: `${u.firstName} ${u.lastName}`.trim(),
          isSuperAdmin: Boolean(u.isSuperAdmin),
        },
      });
    } else {
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: {
          keycloakSub,
          displayName: `${u.firstName} ${u.lastName}`.trim(),
          isSuperAdmin: Boolean(u.isSuperAdmin) || profile.isSuperAdmin,
        },
      });
    }

    profileByUsername.set(u.username, {
      id: profile.id,
      inviteCode: profile.inviteCode,
      keycloakSub: profile.keycloakSub,
    });

    credentialRows.push({
      username: u.username,
      password: u.password,
      inviteCode: profile.inviteCode,
      isSuperAdmin: Boolean(u.isSuperAdmin),
      keycloakSub: profile.keycloakSub,
      keycloakSynced: kc.synced,
      keycloakCreated: kc.created,
      keycloakError: kc.error ?? null,
    });
  }

  let business = await prisma.business.findUnique({ where: { slug: "bewear" } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        code: await allocateUniqueBusinessCode(),
        name: "BeWear",
        slug: "bewear",
        description: "BeWear fashion project",
        color: "#0f766e",
        assignedAt: new Date(),
        links: {
          create: [
            {
              title: "Website",
              url: "https://bewear.example",
              sortOrder: 0,
            },
          ],
        },
      },
    });
  }

  for (const u of users) {
    const profile = profileByUsername.get(u.username)!;
    await prisma.businessMembership.upsert({
      where: {
        profileId_businessId: {
          profileId: profile.id,
          businessId: business.id,
        },
      },
      create: {
        profileId: profile.id,
        businessId: business.id,
        role: u.role ?? "ASSISTANT",
      },
      update: { role: u.role ?? "ASSISTANT" },
    });
  }

  const report = {
    seededAt: new Date().toISOString(),
    databaseUrlHost: (() => {
      try {
        return new URL(process.env.DATABASE_URL!).host;
      } catch {
        return "unknown";
      }
    })(),
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      code: business.code,
      assignedAt: business.assignedAt.toISOString(),
    },
    users: credentialRows,
    keycloakSyncNote: credentialRows.every((r) => r.keycloakSynced)
      ? "All users synced to Keycloak realm pishe."
      : "Some users were Prisma-only. When Keycloak is reachable, re-run yarn seed:bewear or create matching usernames and set Profile.keycloakSub to the Keycloak sub.",
  };

  console.log(JSON.stringify(report, null, 2));

  // Optional local scratch (gitignored data/)
  const outDir = resolve(__dirname, "../data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    resolve(outDir, "seed-bewear-credentials.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log("[seed-bewear] wrote data/seed-bewear-credentials.json (gitignored)");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[seed-bewear] failed", error);
  process.exit(1);
});
