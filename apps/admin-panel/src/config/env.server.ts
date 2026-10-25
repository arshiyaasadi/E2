import { z } from "zod";
import { getAppMode, isUiMode } from "@/config/app-mode";

const uiSchema = z.object({
  APP_MODE: z.literal("ui").default("ui"),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => v.startsWith("file:"), {
      message: "UI mode requires DATABASE_URL starting with file:",
    }),
  AUTH_SECRET: z.string().min(32),
  APP_ENV: z.enum(["development", "production"]).default("development"),
  AUTH_COOKIE_DOMAIN: z.string().optional().default(""),
  /** Optional; ignored in UI mode. */
  KEYCLOAK_ISSUER: z.string().optional().default(""),
  KEYCLOAK_CLIENT_ID: z.string().optional().default(""),
  KEYCLOAK_CLIENT_SECRET: z.string().optional().default(""),
});

const platformSchema = z.object({
  APP_MODE: z.literal("platform"),
  DATABASE_URL: z.string().startsWith("postgresql://"),
  AUTH_SECRET: z.string().min(32),
  APP_ENV: z.enum(["development", "production"]).default("development"),
  KEYCLOAK_ISSUER: z.string().url(),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(8),
  AUTH_COOKIE_DOMAIN: z.string().optional().default(""),
});

function loadServerEnv() {
  const mode = getAppMode();
  const base = {
    APP_MODE: mode,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_ENV: process.env.APP_ENV,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER ?? "",
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID ?? "",
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET ?? "",
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN ?? "",
  };

  const parsed = isUiMode()
    ? uiSchema.safeParse(base)
    : platformSchema.safeParse(base);

  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const serverEnv = loadServerEnv();
