import { prisma } from "@/lib/db/prisma";
import { normalizeMediaFolder, type MediaFolder } from "@/lib/media/folders";
import { purgeMediaObjects } from "@/lib/media/purge";

export type MediaListFilters = {
  q?: string;
  mimeType?: string;
  folder?: string;
  limit?: number;
  offset?: number;
};

export type MediaWriteInput = {
  title?: string | null;
  altText?: string | null;
};

export async function createMediaRecord(input: {
  storageKey: string;
  url: string;
  thumbUrl?: string | null;
  folder: MediaFolder;
  mimeType?: string | null;
  altText?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}) {
  return prisma.media.create({
    data: {
      storageKey: input.storageKey,
      url: input.url,
      thumbUrl: input.thumbUrl ?? null,
      folder: input.folder,
      mimeType: input.mimeType ?? null,
      altText: input.altText ?? null,
      title: input.title ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
    },
  });
}

export async function findMediaById(id: string) {
  return prisma.media.findFirst({
    where: { id, deletedAt: null },
  });
}

export function mapMediaRow(media: {
  id: string;
  storageKey: string;
  url: string;
  thumbUrl?: string | null;
  folder?: string | null;
  title: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  createdAt: Date;
}) {
  return {
    id: media.id,
    storageKey: media.storageKey,
    url: media.url,
    thumbUrl: media.thumbUrl ?? null,
    folder: normalizeMediaFolder(media.folder ?? media.storageKey.split("/")[0]),
    title: media.title,
    altText: media.altText,
    width: media.width,
    height: media.height,
    mimeType: media.mimeType,
    createdAt: media.createdAt.toISOString(),
  };
}

export async function listMedia(filters: MediaListFilters = {}) {
  const q = filters.q?.trim();
  const limit = filters.limit ?? 48;
  const offset = filters.offset ?? 0;
  const folder = filters.folder ? normalizeMediaFolder(filters.folder) : undefined;

  const where = {
    deletedAt: null,
    ...(folder ? { folder } : {}),
    ...(filters.mimeType ? { mimeType: { startsWith: filters.mimeType } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { altText: { contains: q, mode: "insensitive" as const } },
            { storageKey: { contains: q, mode: "insensitive" as const } },
            { url: { contains: q, mode: "insensitive" as const } },
            { folder: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.media.count({ where }),
  ]);

  return {
    items: rows.map(mapMediaRow),
    total,
    limit,
    offset,
  };
}

export async function countMediaUsage(mediaId: string) {
  const [productMedia, categoryImages, categoryOg, productOg, variantMedia, brandImages, pageOg, blogCover, blogOg] =
    await Promise.all([
      prisma.productMedia.count({ where: { mediaId, deletedAt: null } }),
      prisma.category.count({ where: { imageId: mediaId, deletedAt: null } }),
      prisma.category.count({ where: { ogImageId: mediaId, deletedAt: null } }),
      prisma.product.count({ where: { ogImageId: mediaId, deletedAt: null } }),
      prisma.productVariant.count({ where: { mediaId, deletedAt: null } }),
      prisma.brand.count({ where: { imageId: mediaId, deletedAt: null } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM "pages"
        WHERE "og_image_id" = CAST(${mediaId} AS uuid)
          AND "deleted_at" IS NULL
      `.then((rows) => Number(rows[0]?.count ?? 0)).catch(() => 0),
      prisma.blogPost.count({ where: { coverImageId: mediaId, deletedAt: null } }),
      prisma.blogPost.count({ where: { ogImageId: mediaId, deletedAt: null } }),
    ]);

  return (
    productMedia +
    categoryImages +
    categoryOg +
    productOg +
    variantMedia +
    brandImages +
    pageOg +
    blogCover +
    blogOg
  );
}

export async function updateMedia(id: string, data: MediaWriteInput) {
  const row = await prisma.media.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.altText !== undefined ? { altText: data.altText } : {}),
    },
  });
  return mapMediaRow(row);
}

export async function softDeleteMedia(id: string) {
  const usage = await countMediaUsage(id);
  if (usage > 0) {
    throw new Error("Media is in use and cannot be deleted");
  }

  const existing = await findMediaById(id);
  if (!existing) {
    throw new Error("Media not found");
  }

  await prisma.media.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  try {
    await purgeMediaObjects(existing.storageKey);
  } catch (error) {
    console.error("[media] failed to purge storage objects", existing.storageKey, error);
  }
}
