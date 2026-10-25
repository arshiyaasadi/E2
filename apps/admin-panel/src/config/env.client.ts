import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "production"]).default("development"),
  NEXT_PUBLIC_APP_MODE: z.enum(["ui", "platform"]).default("ui"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

function loadClientEnv() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE ?? process.env.APP_MODE ?? "ui",
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid client env: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const clientEnv = loadClientEnv();

export function isClientUiMode() {
  return clientEnv.NEXT_PUBLIC_APP_MODE === "ui";
}
