import { MEDIA_FOLDERS, MEDIA_FOLDER_VALUES, type MediaFolder } from "@/lib/media/folders";

export { MEDIA_FOLDERS, MEDIA_FOLDER_VALUES };
export type { MediaFolder };

export const MEDIA_UPLOAD_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ],
  /** Max edge length for generated WebP thumbnails */
  thumbMaxEdge: 400,
  thumbQuality: 80,
} as const;
