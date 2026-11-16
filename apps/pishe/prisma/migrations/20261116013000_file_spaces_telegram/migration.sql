-- CreateEnum
CREATE TYPE "FileSpaceKind" AS ENUM ('USER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "FileObjectSource" AS ENUM ('UPLOAD', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "TelegramBindingStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "FileSpace" (
    "id" TEXT NOT NULL,
    "kind" "FileSpaceKind" NOT NULL,
    "ownerProfileId" TEXT,
    "businessId" TEXT,
    "quotaBytes" BIGINT NOT NULL,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "source" "FileObjectSource" NOT NULL DEFAULT 'UPLOAD',
    "telegramMessageId" TEXT,
    "telegramChatId" TEXT,
    "createdByProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTelegramBinding" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "telegramChatId" TEXT,
    "telegramUserId" TEXT,
    "registeredByProfileId" TEXT NOT NULL,
    "status" "TelegramBindingStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTelegramBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessTelegramIngestConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "storeText" BOOLEAN NOT NULL DEFAULT true,
    "downloadPhoto" BOOLEAN NOT NULL DEFAULT true,
    "downloadDocument" BOOLEAN NOT NULL DEFAULT true,
    "downloadVideo" BOOLEAN NOT NULL DEFAULT true,
    "downloadAudio" BOOLEAN NOT NULL DEFAULT true,
    "maxMediaBytes" BIGINT NOT NULL DEFAULT 26214400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessTelegramIngestConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileSpace_ownerProfileId_key" ON "FileSpace"("ownerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileSpace_businessId_key" ON "FileSpace"("businessId");

-- CreateIndex
CREATE INDEX "FileSpace_kind_idx" ON "FileSpace"("kind");

-- CreateIndex
CREATE INDEX "FileObject_telegramChatId_idx" ON "FileObject"("telegramChatId");

-- CreateIndex
CREATE INDEX "FileObject_source_idx" ON "FileObject"("source");

-- CreateIndex
CREATE UNIQUE INDEX "FileObject_spaceId_path_key" ON "FileObject"("spaceId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTelegramBinding_businessId_key" ON "BusinessTelegramBinding"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTelegramBinding_telegramChatId_key" ON "BusinessTelegramBinding"("telegramChatId");

-- CreateIndex
CREATE INDEX "BusinessTelegramBinding_telegramUserId_idx" ON "BusinessTelegramBinding"("telegramUserId");

-- CreateIndex
CREATE INDEX "BusinessTelegramBinding_status_idx" ON "BusinessTelegramBinding"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessTelegramIngestConfig_businessId_key" ON "BusinessTelegramIngestConfig"("businessId");

-- AddForeignKey
ALTER TABLE "FileSpace" ADD CONSTRAINT "FileSpace_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSpace" ADD CONSTRAINT "FileSpace_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "FileSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_createdByProfileId_fkey" FOREIGN KEY ("createdByProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTelegramBinding" ADD CONSTRAINT "BusinessTelegramBinding_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTelegramBinding" ADD CONSTRAINT "BusinessTelegramBinding_registeredByProfileId_fkey" FOREIGN KEY ("registeredByProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessTelegramIngestConfig" ADD CONSTRAINT "BusinessTelegramIngestConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill USER spaces (100 MiB)
INSERT INTO "FileSpace" ("id", "kind", "ownerProfileId", "quotaBytes", "usedBytes", "createdAt", "updatedAt")
SELECT
  'fs_u_' || "id",
  'USER'::"FileSpaceKind",
  "id",
  104857600,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Profile"
ON CONFLICT DO NOTHING;

-- Backfill BUSINESS spaces (2 GiB) + ingest config
INSERT INTO "FileSpace" ("id", "kind", "businessId", "quotaBytes", "usedBytes", "createdAt", "updatedAt")
SELECT
  'fs_b_' || "id",
  'BUSINESS'::"FileSpaceKind",
  "id",
  2147483648,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Business"
ON CONFLICT DO NOTHING;

INSERT INTO "BusinessTelegramIngestConfig" (
  "id", "businessId", "storeText", "downloadPhoto", "downloadDocument",
  "downloadVideo", "downloadAudio", "maxMediaBytes", "createdAt", "updatedAt"
)
SELECT
  'tgcfg_' || "id",
  "id",
  true, true, true, true, true,
  26214400,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Business"
ON CONFLICT DO NOTHING;
