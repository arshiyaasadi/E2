-- AlterTable FileObject: artifact kind for meta/media dedupe
ALTER TABLE "FileObject" ADD COLUMN "telegramArtifact" TEXT;

-- AlterTable BusinessTelegramBinding: ingest cursor + pause
ALTER TABLE "BusinessTelegramBinding" ADD COLUMN "lastIngestedMessageId" TEXT;
ALTER TABLE "BusinessTelegramBinding" ADD COLUMN "lastIngestedAt" TIMESTAMP(3);
ALTER TABLE "BusinessTelegramBinding" ADD COLUMN "lastTelegramUpdateId" BIGINT;
ALTER TABLE "BusinessTelegramBinding" ADD COLUMN "ingestPaused" BOOLEAN NOT NULL DEFAULT false;

-- Backfill artifact for existing telegram rows (meta if path ends with -meta.json else media)
UPDATE "FileObject"
SET "telegramArtifact" = CASE
  WHEN "path" LIKE '%-meta.json' THEN 'meta'
  ELSE 'media'
END
WHERE "source" = 'TELEGRAM'
  AND "telegramChatId" IS NOT NULL
  AND "telegramMessageId" IS NOT NULL
  AND "telegramArtifact" IS NULL;

-- Dedupe unique: one (space, chat, message, artifact) for Telegram ingest
CREATE UNIQUE INDEX "FileObject_spaceId_telegramChatId_telegramMessageId_telegramArtifact_key"
ON "FileObject" ("spaceId", "telegramChatId", "telegramMessageId", "telegramArtifact");
