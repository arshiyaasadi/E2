import { z } from "zod";

const serverSchema = z.object({
  KEYCLOAK_BASE_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().min(1).default("pishe"),
  KEYCLOAK_APP_CLIENT_ID: z.string().min(1),
  KEYCLOAK_APP_CLIENT_SECRET: z.string().min(1),
  KEYCLOAK_BFF_CLIENT_ID: z.string().min(1),
  KEYCLOAK_BFF_CLIENT_SECRET: z.string().min(1),
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  FILE_SERVICE_BASE_URL: z.string().url().default("http://127.0.0.1:8088"),
  FILE_SERVICE_KEYCLOAK_ISSUER: z
    .string()
    .url()
    .default("https://sso.abysso.ir/realms/operators"),
  FILE_SERVICE_CLIENT_ID: z.string().min(1).default("svc-store-backend"),
  FILE_SERVICE_CLIENT_SECRET: z.string().min(1).optional(),
  FILE_SERVICE_PRESIGN_CONNECT: z.string().min(1).default("127.0.0.1:9000"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse({
    KEYCLOAK_BASE_URL: process.env.KEYCLOAK_BASE_URL,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM ?? "pishe",
    KEYCLOAK_APP_CLIENT_ID: process.env.KEYCLOAK_APP_CLIENT_ID,
    KEYCLOAK_APP_CLIENT_SECRET: process.env.KEYCLOAK_APP_CLIENT_SECRET,
    KEYCLOAK_BFF_CLIENT_ID: process.env.KEYCLOAK_BFF_CLIENT_ID,
    KEYCLOAK_BFF_CLIENT_SECRET: process.env.KEYCLOAK_BFF_CLIENT_SECRET,
    APP_ENV: process.env.APP_ENV ?? "development",
    FILE_SERVICE_BASE_URL: process.env.FILE_SERVICE_BASE_URL,
    FILE_SERVICE_KEYCLOAK_ISSUER: process.env.FILE_SERVICE_KEYCLOAK_ISSUER,
    FILE_SERVICE_CLIENT_ID: process.env.FILE_SERVICE_CLIENT_ID,
    FILE_SERVICE_CLIENT_SECRET: process.env.FILE_SERVICE_CLIENT_SECRET,
    FILE_SERVICE_PRESIGN_CONNECT: process.env.FILE_SERVICE_PRESIGN_CONNECT,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server env: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function requireFileServiceSecret(env: ServerEnv = serverEnv): string {
  if (!env.FILE_SERVICE_CLIENT_SECRET) {
    throw new Error(
      "FILE_SERVICE_CLIENT_SECRET is required for product image uploads",
    );
  }
  return env.FILE_SERVICE_CLIENT_SECRET;
}

export const serverEnv = loadServerEnv();

export function keycloakIssuer(env: ServerEnv = serverEnv): string {
  return `${env.KEYCLOAK_BASE_URL.replace(/\/$/, "")}/realms/${env.KEYCLOAK_REALM}`;
}

export function keycloakAdminBase(env: ServerEnv = serverEnv): string {
  return `${env.KEYCLOAK_BASE_URL.replace(/\/$/, "")}/admin/realms/${env.KEYCLOAK_REALM}`;
}
