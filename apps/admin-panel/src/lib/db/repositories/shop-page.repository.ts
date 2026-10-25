import type { Prisma, ShopPageStatus, ShopPageType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type ShopPageWriteInput = {
  title?: string;
  titleFa?: string | null;
  description?: string | null;
  slug?: string;
  type?: ShopPageType;
  status?: ShopPageStatus;
  isMain?: boolean;
  mapsCategorySlug?: string | null;
  filters?: Prisma.InputJsonValue;
  pinnedProductIds?: Prisma.InputJsonValue;
  blocks?: Prisma.InputJsonValue;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageId?: string | null;
  publishedAt?: Date | null;
};

function mapShopPage(row: {
  id: string;
  slug: string;
  title: string;
  titleFa: string | null;
  description: string | null;
  type: ShopPageType;
  status: ShopPageStatus;
  isMain: boolean;
  mapsCategorySlug: string | null;
  filters: unknown;
  pinnedProductIds: unknown;
  blocks: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleFa: row.titleFa,
    description: row.description,
    type: row.type,
    status: row.status,
    isMain: row.isMain,
    mapsCategorySlug: row.mapsCategorySlug,
    filters: (row.filters ?? {}) as Record<string, unknown>,
    pinnedProductIds: Array.isArray(row.pinnedProductIds)
      ? (row.pinnedProductIds as string[])
      : [],
    blocks: (row.blocks ?? []) as unknown[],
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoImageId: row.seoImageId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listShopPages() {
  const rows = await prisma.shopPage.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapShopPage);
}

export async function findShopPageById(id: string) {
  const row = await prisma.shopPage.findFirst({
    where: { id, deletedAt: null },
  });
  return row ? mapShopPage(row) : null;
}

export async function createShopPage(
  data: Required<Pick<ShopPageWriteInput, "title" | "slug" | "type">> &
    Omit<ShopPageWriteInput, "title" | "slug" | "type">,
) {
  const row = await prisma.shopPage.create({
    data: {
      title: data.title,
      titleFa: data.titleFa ?? null,
      description: data.description ?? null,
      slug: data.slug,
      type: data.type,
      status: data.status ?? "draft",
      isMain: data.isMain ?? false,
      mapsCategorySlug: data.mapsCategorySlug ?? null,
      filters: data.filters ?? {},
      pinnedProductIds: data.pinnedProductIds ?? [],
      blocks: data.blocks ?? [],
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      seoImageId: data.seoImageId ?? null,
      publishedAt: data.publishedAt ?? null,
    },
  });
  return mapShopPage(row);
}

export async function updateShopPage(id: string, data: ShopPageWriteInput) {
  const row = await prisma.shopPage.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.titleFa !== undefined ? { titleFa: data.titleFa } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.isMain !== undefined ? { isMain: data.isMain } : {}),
      ...(data.mapsCategorySlug !== undefined ? { mapsCategorySlug: data.mapsCategorySlug } : {}),
      ...(data.filters !== undefined ? { filters: data.filters } : {}),
      ...(data.pinnedProductIds !== undefined
        ? { pinnedProductIds: data.pinnedProductIds }
        : {}),
      ...(data.blocks !== undefined ? { blocks: data.blocks } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.seoImageId !== undefined ? { seoImageId: data.seoImageId } : {}),
      ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
    },
  });
  return mapShopPage(row);
}

export async function softDeleteShopPage(id: string) {
  await prisma.shopPage.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function shopPageSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.shopPage.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

export async function shopPageMapsCategorySlugExists(mapsCategorySlug: string, excludeId?: string) {
  const row = await prisma.shopPage.findFirst({
    where: {
      mapsCategorySlug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}
