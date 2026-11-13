import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Pishe"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3010"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

function loadClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    throw new Error(`Invalid client env: ${parsed.error.message}`);
  }

  return parsed.data;
}

export const clientEnv = loadClientEnv();
