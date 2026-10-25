import { randomUUID } from "crypto";
import { extname } from "path";
import { buildPublicMediaUrl } from "@/lib/storage/config";
import { putObject } from "@/lib/storage/object-storage";
import { createMediaRecord } from "@/lib/db/repositories/media.repository";
import {
  MEDIA_UPLOAD_LIMITS,
  type MediaFolder,
} from "@/lib/media/constants";
import { buildMediaObjectPrefix, normalizeMediaFolder } from "@/lib/media/folders";

/** Lazy-load so `next build` page collection does not require native sharp binaries. */
async function loadSharp() {
  const mod = await import("sharp");
  return mod.default;
}

const ALLOWED_MIME_TYPES = new Set<string>(MEDIA_UPLOAD_LIMITS.allowedMimeTypes);
const MAX_FILE_SIZE_BYTES = MEDIA_UPLOAD_LIMITS.maxBytes;

export interface UploadMediaInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
  altText?: string | null;
  title?: string | null;
}

export interface UploadMediaResult {
  id: string;
  storageKey: string;
  url: string;
  thumbUrl: string | null;
  folder: MediaFolder;
  mimeType: string;
  altText: string | null;
  title: string | null;
  width: number | null;
  height: number | null;
}

function extensionForMime(mimeType: string, originalName: string) {
  const fromName = extname(originalName).toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;

  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return "";
  }
}

export function validateUploadFile(file: { size: number; mimeType: string }) {
  if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
    return { ok: false as const, message: "Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, SVG" };
  }
  if (file.size <= 0) {
    return { ok: false as const, message: "Empty file" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false as const, message: "File exceeds 5MB limit" };
  }
  return { ok: true as const };
}

async function extractImageMeta(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/svg+xml") {
    return { width: null as number | null, height: null as number | null };
  }

  try {
    const sharp = await loadSharp();
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
    };
  } catch {
    return { width: null as number | null, height: null as number | null };
  }
}

async function buildThumbnail(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/svg+xml" || mimeType === "image/gif") {
    return null;
  }

  try {
    const sharp = await loadSharp();
    return await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize(MEDIA_UPLOAD_LIMITS.thumbMaxEdge, MEDIA_UPLOAD_LIMITS.thumbMaxEdge, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: MEDIA_UPLOAD_LIMITS.thumbQuality })
      .toBuffer();
  } catch {
    return null;
  }
}

/** Local shop object upload into ecommerce MinIO + `media` projection. Shared storage is Abysso Files. */
export async function uploadMediaFile(input: UploadMediaInput): Promise<UploadMediaResult> {
  const validation = validateUploadFile({ size: input.buffer.length, mimeType: input.mimeType });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const folder = normalizeMediaFolder(input.folder);
  const objectId = randomUUID();
  const ext = extensionForMime(input.mimeType, input.originalName);
  const prefix = buildMediaObjectPrefix(folder, objectId);
  const storageKey = `${prefix}/original${ext}`;

  await putObject({
    key: storageKey,
    body: input.buffer,
    contentType: input.mimeType,
  });

  const { width, height } = await extractImageMeta(input.buffer, input.mimeType);
  let thumbUrl: string | null = null;

  const thumbBuffer = await buildThumbnail(input.buffer, input.mimeType);
  if (thumbBuffer) {
    const thumbKey = `${prefix}/thumb.webp`;
    await putObject({
      key: thumbKey,
      body: thumbBuffer,
      contentType: "image/webp",
    });
    thumbUrl = buildPublicMediaUrl(thumbKey);
  }

  const url = buildPublicMediaUrl(storageKey);
  const record = await createMediaRecord({
    storageKey,
    url,
    thumbUrl,
    folder,
    mimeType: input.mimeType,
    altText: input.altText ?? null,
    title: input.title ?? null,
    width,
    height,
  });

  return {
    id: record.id,
    storageKey: record.storageKey,
    url: record.url,
    thumbUrl: record.thumbUrl,
    folder: normalizeMediaFolder(record.folder),
    mimeType: record.mimeType ?? input.mimeType,
    altText: record.altText,
    title: record.title,
    width: record.width,
    height: record.height,
  };
}

export { MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
export { purgeMediaObjects } from "@/lib/media/purge";
