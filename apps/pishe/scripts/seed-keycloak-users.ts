/**
 * Ensure flamingo-manager exists in realm `pishe`.
 * Requires Keycloak up and KEYCLOAK_* env (from apps/pishe/.env.local).
 *
 * Usage: yarn workspace pishe seed:keycloak
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const { ensureManagerUser } = await import("../src/lib/auth/keycloak/client");

  const result = await ensureManagerUser({
    password: process.env.PISHE_MANAGER_PASSWORD,
  });

  console.log(
    "[pishe-seed] flamingo-manager",
    JSON.stringify({
      username: result.username,
      password: result.password,
      created: result.created,
    }),
  );
  console.log("Copy these credentials now. They are not stored in Git.");
}

main().catch((error) => {
  console.error("[pishe-seed] failed", error);
  process.exit(1);
});
