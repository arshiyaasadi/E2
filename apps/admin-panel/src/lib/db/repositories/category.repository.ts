import type { CategoryKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { mapMediaRow } from "@/lib/db/repositories/media.repository";
import type { CategoryPageSettings, DescriptionBlock, ShopPageFilters } from "@/types/domain";

type MediaInclude = {
  id: string;
  storageKey: string;
  url: string;
  thumbUrl?: string | null;
  title: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  createdAt: Date;
};

type PinnedProductInclude = {
  productId: string;
  position: number;
  product: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
};

type MediaLinkInclude = {
  mediaId: string;
  position: number;
  media: MediaInclude;
};

type CategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
  nameFa: string;
  slug: string;
  description: string | null;
  kind: CategoryKind;
  menuVisible: boolean;
  filters: unknown;
  descriptionBlocks: unknown;
  pageSettings: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  imageId: string | null;
  canonicalUrl: string | null;
  metaRobots: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  image: MediaInclude | null;
  ogImage: MediaInclude | null;
  mediaLinks?: MediaLinkInclude[];
  pinnedProducts?: PinnedProductInclude[];
};

function asFilters(raw: unknown): ShopPageFilters {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ShopPageFilters;
}

function asDescriptionBlocks(raw: unknown): DescriptionBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw as DescriptionBlock[];
}

function asPageSettings(raw: unknown): CategoryPageSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CategoryPageSettings;
}

function mapCategory(category: CategoryRow) {
  const gallery = (category.mediaLinks ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((link) => ({
      mediaId: link.mediaId,
      position: link.position,
      media: mapMediaRow(link.media),
    }));

  const pinnedProducts = (category.pinnedProducts ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((pin) => ({
      productId: pin.productId,
      position: pin.position,
      title: pin.product.title,
      slug: pin.product.slug,
      status: pin.product.status,
    }));

  return {
    id: category.id,
    parentId: category.parentId,
    name: category.name,
    nameFa: category.nameFa,
    slug: category.slug,
    description: category.description,
    kind: category.kind as "real" | "virtual",
    menuVisible: category.menuVisible,
    filters: asFilters(category.filters),
    descriptionBlocks: asDescriptionBlocks(category.descriptionBlocks),
    pageSettings: asPageSettings(category.pageSettings),
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    ogTitle: category.ogTitle,
    ogDescription: category.ogDescription,
    ogImageId: category.ogImageId,
    ogImage: category.ogImage ? mapMediaRow(category.ogImage) : null,
    imageId: category.imageId,
    image: category.image ? mapMediaRow(category.image) : null,
    gallery,
    pinnedProducts,
    pinnedProductIds: pinnedProducts.map((p) => p.productId),
    canonicalUrl: category.canonicalUrl,
    metaRobots: category.metaRobots,
    position: category.position,
    collectionPath: `/collection/${category.slug}`,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

const categoryInclude = {
  image: true,
  ogImage: true,
  mediaLinks: {
    include: { media: true },
    orderBy: { position: "asc" as const },
  },
  pinnedProducts: {
    include: {
      product: {
        select: { id: true, title: true, slug: true, status: true },
      },
    },
    orderBy: { position: "asc" as const },
  },
} as const;

export type CategoryWriteInput = {
  name?: string;
  nameFa?: string;
  slug?: string;
  description?: string | null;
  kind?: "real" | "virtual";
  menuVisible?: boolean;
  filters?: ShopPageFilters;
  descriptionBlocks?: DescriptionBlock[];
  pageSettings?: CategoryPageSettings;
  parentId?: string | null;
  imageId?: string | null;
  galleryMediaIds?: string[];
  pinnedProductIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
  position?: number;
};

function mergeCollectionFilters(
  kind: "real" | "virtual",
  slug: string,
  filters: ShopPageFilters | undefined,
): ShopPageFilters {
  const next: ShopPageFilters = { ...(filters ?? {}) };
  if (kind === "real") {
    const cats = new Set(next.category ?? []);
    cats.add(slug);
    next.category = [...cats];
  }
  return next;
}

async function purgeProductLinksForCategory(tx: Prisma.TransactionClient, categoryId: string) {
  await tx.productCategory.deleteMany({ where: { categoryId } });
  await tx.product.updateMany({
    where: { categoryId },
    data: { categoryId: null },
  });
}

async function syncGallery(
  tx: Prisma.TransactionClient,
  categoryId: string,
  mediaIds: string[] | undefined,
) {
  if (mediaIds === undefined) return null;
  await tx.categoryMedia.deleteMany({ where: { categoryId } });
  if (mediaIds.length) {
    await tx.categoryMedia.createMany({
      data: mediaIds.map((mediaId, position) => ({ categoryId, mediaId, position })),
    });
  }
  return mediaIds[0] ?? null;
}

async function syncPinnedProducts(
  tx: Prisma.TransactionClient,
  categoryId: string,
  productIds: string[] | undefined,
) {
  if (productIds === undefined) return [];
  await tx.categoryPinnedProduct.deleteMany({ where: { categoryId } });
  if (productIds.length) {
    await tx.categoryPinnedProduct.createMany({
      data: productIds.map((productId, position) => ({ categoryId, productId, position })),
    });
  }
  return productIds;
}

export async function syncShopPageFromCategory(category: {
  slug: string;
  name: string;
  nameFa: string;
  description: string | null;
  kind: "real" | "virtual";
  filters: ShopPageFilters;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  imageId: string | null;
  ogImageId?: string | null;
  pinnedProductIds: string[];
  deletedAt?: Date | null;
}) {
  const filters = mergeCollectionFilters(category.kind, category.slug, category.filters);
  const existing = await prisma.shopPage.findFirst({
    where: {
      deletedAt: null,
      OR: [{ slug: category.slug }, { mapsCategorySlug: category.slug }],
    },
  });

  const payload = {
    title: category.name,
    titleFa: category.nameFa,
    description: category.description,
    type: "search" as const,
    status: "published" as const,
    isMain: false,
    mapsCategorySlug: category.slug,
    slug: category.slug,
    filters: filters as Prisma.InputJsonValue,
    pinnedProductIds: category.pinnedProductIds as Prisma.InputJsonValue,
    seoTitle: category.seoTitle || category.ogTitle || null,
    seoDescription: category.seoDescription || category.ogDescription || null,
    seoImageId: category.ogImageId || category.imageId,
    publishedAt: new Date(),
    deletedAt: null as Date | null,
  };

  if (category.deletedAt) {
    if (existing) {
      await prisma.shopPage.update({
        where: { id: existing.id },
        data: { status: "draft", deletedAt: new Date() },
      });
    }
    return;
  }

  if (existing) {
    await prisma.shopPage.update({
      where: { id: existing.id },
      data: payload,
    });
    return;
  }

  await prisma.shopPage.create({ data: payload });
}

export async function listCategories() {
  const rows = await prisma.category.findMany({
    where: { deletedAt: null },
    include: categoryInclude,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  return rows.map(mapCategory);
}

export async function findCategoryById(id: string) {
  const row = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: categoryInclude,
  });
  return row ? mapCategory(row) : null;
}

export async function createCategory(
  data: Required<Pick<CategoryWriteInput, "name" | "slug">> & CategoryWriteInput,
) {
  const kind = data.kind ?? "real";
  const filters = mergeCollectionFilters(kind, data.slug, data.filters);
  const galleryIds = data.galleryMediaIds;
  const imageId = galleryIds !== undefined ? (galleryIds[0] ?? null) : (data.imageId ?? null);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        name: data.name,
        nameFa: data.nameFa ?? data.name,
        slug: data.slug,
        description: data.description ?? null,
        kind,
        menuVisible: data.menuVisible ?? true,
        filters: filters as Prisma.InputJsonValue,
        descriptionBlocks: (data.descriptionBlocks ?? []) as Prisma.InputJsonValue,
        pageSettings: (data.pageSettings ?? {}) as Prisma.InputJsonValue,
        parentId: data.parentId ?? null,
        imageId,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogTitle: data.ogTitle ?? null,
        ogDescription: data.ogDescription ?? null,
        ogImageId: data.ogImageId ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        metaRobots: data.metaRobots ?? "index,follow",
        position: data.position ?? 0,
      },
    });

    await syncGallery(tx, created.id, galleryIds);
    const pinned = await syncPinnedProducts(tx, created.id, data.pinnedProductIds ?? []);

    if (kind === "virtual") {
      await purgeProductLinksForCategory(tx, created.id);
    }

    return { id: created.id, pinned };
  });

  const mapped = await findCategoryById(row.id);
  if (!mapped) throw new Error("Category create failed");

  await syncShopPageFromCategory({
    slug: mapped.slug,
    name: mapped.name,
    nameFa: mapped.nameFa,
    description: mapped.description,
    kind: mapped.kind,
    filters: mapped.filters,
    seoTitle: mapped.seoTitle,
    seoDescription: mapped.seoDescription,
    ogTitle: mapped.ogTitle,
    ogDescription: mapped.ogDescription,
    imageId: mapped.imageId,
    ogImageId: mapped.ogImageId,
    pinnedProductIds: mapped.pinnedProductIds,
  });

  return mapped;
}

export async function updateCategory(id: string, data: CategoryWriteInput) {
  const existing = await findCategoryById(id);
  if (!existing) return null;

  const nextKind = data.kind ?? existing.kind;
  const nextSlug = data.slug ?? existing.slug;
  const nextFilters =
    data.filters !== undefined
      ? mergeCollectionFilters(nextKind, nextSlug, data.filters)
      : mergeCollectionFilters(nextKind, nextSlug, existing.filters);

  await prisma.$transaction(async (tx) => {
    const firstGalleryId =
      data.galleryMediaIds !== undefined
        ? await syncGallery(tx, id, data.galleryMediaIds)
        : undefined;

    await tx.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.nameFa !== undefined ? { nameFa: data.nameFa } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.menuVisible !== undefined ? { menuVisible: data.menuVisible } : {}),
        filters: nextFilters as Prisma.InputJsonValue,
        ...(data.descriptionBlocks !== undefined
          ? { descriptionBlocks: data.descriptionBlocks as Prisma.InputJsonValue }
          : {}),
        ...(data.pageSettings !== undefined
          ? { pageSettings: data.pageSettings as Prisma.InputJsonValue }
          : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(firstGalleryId !== undefined
          ? { imageId: firstGalleryId }
          : data.imageId !== undefined
            ? { imageId: data.imageId }
            : {}),
        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        ...(data.ogTitle !== undefined ? { ogTitle: data.ogTitle } : {}),
        ...(data.ogDescription !== undefined ? { ogDescription: data.ogDescription } : {}),
        ...(data.ogImageId !== undefined ? { ogImageId: data.ogImageId } : {}),
        ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl } : {}),
        ...(data.metaRobots !== undefined ? { metaRobots: data.metaRobots } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
    });

    await syncPinnedProducts(tx, id, data.pinnedProductIds);

    if (nextKind === "virtual") {
      await purgeProductLinksForCategory(tx, id);
    }
  });

  const mapped = await findCategoryById(id);
  if (!mapped) return null;

  await syncShopPageFromCategory({
    slug: mapped.slug,
    name: mapped.name,
    nameFa: mapped.nameFa,
    description: mapped.description,
    kind: mapped.kind,
    filters: mapped.filters,
    seoTitle: mapped.seoTitle,
    seoDescription: mapped.seoDescription,
    ogTitle: mapped.ogTitle,
    ogDescription: mapped.ogDescription,
    imageId: mapped.imageId,
    ogImageId: mapped.ogImageId,
    pinnedProductIds: mapped.pinnedProductIds,
  });

  return mapped;
}

export async function softDeleteCategory(id: string) {
  const existing = await findCategoryById(id);
  await prisma.category.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  if (existing) {
    await syncShopPageFromCategory({
      ...existing,
      pinnedProductIds: existing.pinnedProductIds,
      deletedAt: new Date(),
    });
  }
}

export async function reorderCategories(
  items: Array<{ id: string; parentId: string | null; position: number }>,
) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { parentId: item.parentId, position: item.position },
      }),
    ),
  );
  return listCategories();
}

export async function slugExists(slug: string, excludeId?: string) {
  const row = await prisma.category.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}
