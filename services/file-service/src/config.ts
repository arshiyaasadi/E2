function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required("DATABASE_URL", "postgres://file_service:REPLACE@localhost:5432/file_service"),
  keycloak: {
    issuer: required(
      "KEYCLOAK_ISSUER",
      "https://REPLACE_KEYCLOAK_HOSTNAME/realms/operators",
    ),
    // Empty or "*" skips audience check (tokens often use client "account" until gateway/client setup).
    audience: process.env.KEYCLOAK_AUDIENCE ?? "",
  },
  minio: {
    endpoint: required("MINIO_ENDPOINT", "http://minio.platform-storage.svc:9000"),
    region: process.env.MINIO_REGION ?? "us-east-1",
    accessKey: required("MINIO_ACCESS_KEY", "REPLACE_FILE_SERVICE_ACCESS_KEY"),
    secretKey: required("MINIO_SECRET_KEY", "REPLACE_FILE_SERVICE_SECRET_KEY"),
    bucket: process.env.MINIO_BUCKET ?? "product-images",
    forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE !== "false",
  },
  productImage: {
    maxBytes: Number(process.env.PRODUCT_IMAGE_MAX_BYTES ?? 5 * 1024 * 1024),
    allowedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
    uploadUrlTtlSeconds: Number(process.env.UPLOAD_URL_TTL_SECONDS ?? 300),
    downloadUrlTtlSeconds: Number(process.env.DOWNLOAD_URL_TTL_SECONDS ?? 300),
  },
};

export type AllowedContentType = (typeof config.productImage.allowedTypes)[number];
