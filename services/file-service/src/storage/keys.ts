const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForContentType(contentType: string): string | undefined {
  return EXT_BY_TYPE[contentType];
}

/**
 * Canonical object key for product images.
 * users/{user_id}/products/{owner_ref}/{file_id}.{ext}
 */
export function buildProductImageObjectKey(params: {
  userId: string;
  ownerRef: string;
  fileId: string;
  contentType: string;
}): string {
  const ext = extensionForContentType(params.contentType);
  if (!ext) {
    throw new Error(`Unsupported content type: ${params.contentType}`);
  }
  const userId = sanitizeSegment(params.userId);
  const ownerRef = sanitizeSegment(params.ownerRef);
  const fileId = sanitizeSegment(params.fileId);
  return `users/${userId}/products/${ownerRef}/${fileId}.${ext}`;
}

function sanitizeSegment(value: string): string {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid path segment: ${value}`);
  }
  return value;
}
