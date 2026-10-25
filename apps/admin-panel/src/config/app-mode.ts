/**
 * APP_MODE=ui — local feature / presentation lab.
 * Uses Prisma SQLite, password login, and local file media.
 * Platform services (Keycloak, MinIO, gateway) are not required.
 */
export type AppMode = "ui" | "platform";

export function getAppMode(): AppMode {
  const raw = (process.env.APP_MODE ?? process.env.NEXT_PUBLIC_APP_MODE ?? "ui")
    .trim()
    .toLowerCase();
  return raw === "platform" ? "platform" : "ui";
}

export function isUiMode(): boolean {
  return getAppMode() === "ui";
}
