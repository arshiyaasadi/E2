import { z } from "zod";
import { isUiMode } from "@/config/app-mode";

const configSchema = z.object({
  driver: z.enum(["local", "minio"]).default("local"),
  endpoint: z.string().min(1),
  port: z.coerce.number().int().positive(),
  useSsl: z.enum(["true", "false"]).transform((v) => v === "true"),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  bucket: z.string().min(1),
  publicUrl: z.string().url(),
  localPublicPath: z.string().default("uploads"),
});

export type StorageConfig = z.infer<typeof configSchema>;

let cached: StorageConfig | null = null;

export function getStorageConfig(): StorageConfig {
  if (cached) return cached;

  const driver =
    process.env.MEDIA_DRIVER ??
    (isUiMode() ? "local" : "minio");

  const parsed = configSchema.safeParse({
    driver,
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: process.env.MINIO_PORT ?? "9000",
    useSsl: process.env.MINIO_USE_SSL ?? "false",
    accessKey: process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "ecommerce-media",
    publicUrl:
      process.env.MINIO_PUBLIC_URL ??
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
      "http://localhost:3000/uploads",
    localPublicPath: process.env.MEDIA_LOCAL_PATH ?? "uploads",
  });

  if (!parsed.success) {
    throw new Error(`Invalid storage configuration: ${parsed.error.issues[0]?.message}`);
  }

  cached = parsed.data;
  return cached;
}

export function buildPublicMediaUrl(storageKey: string) {
  const { publicUrl } = getStorageConfig();
  return `${publicUrl.replace(/\/$/, "")}/${storageKey.replace(/^\//, "")}`;
}
