import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { mapMediaRow } from "@/lib/db/repositories/media.repository";
import {
  listProductOptions,
  listProductPriceHistory,
  listProductSnapshots,
  listProductVariants,
  syncProductVariants,
  type ProductVariantsPayload,
} from "@/lib/db/repositories/product-variant.repository";
import { syncProductTags } from "@/lib/db/repositories/tag.repository";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductType = "physical" | "digital";

export type ProductListFilters = {
  q?: string;
  status?: ProductStatus;
  productType?: ProductType;
  brandId?: string;
  categoryId?: string;
};

export type ProductWriteInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  descriptionBlocks?: unknown;
  productType?: ProductType;
  status?: ProductStatus;
  categoryId?: string | null;
  categoryIds?: string[];
  brandId?: string | null;
  basePrice?: number | null;
  comparePrice?: number | null;
  isRefundable?: boolean;
  isFeatured?: boolean;
  popularityScore?: number;
  featuredImageId?: string | null;
  mediaIds?: string[];
  tagIds?: string[];
  variants?: ProductVariantsPayload;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
};

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  ogImage: true,
  categories: {
    orderBy: { position: "asc" as const },
    include: { category: { select: { id: true, name: true, slug: true } } },
  },
  tags: {
    include: { tag: { select: { id: true, name: true, nameFa: true, slug: true } } },
  },
  media: {
    where: { deletedAt: null },
    orderBy: { position: "asc" as const },
    include: { media: true },
  },
} as const;

type ProductRow = {
  id: string;
  categoryId: string | null;
  brandId: string | null;
  title: string;
  slug: string;
  description: string | null;
  descriptionBlocks: unknown;
  productType: ProductType;
  status: ProductStatus;
  basePrice: Decimal | null;
  comparePrice: Decimal | null;
  isRefundable: boolean;
  isFeatured: boolean;
  popularityScore: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  canonicalUrl: string | null;
  metaRobots: string;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string } | null;
  ogImage: Parameters<typeof mapMediaRow>[0] | null;
  categories: Array<{
    categoryId: string;
    position: number;
    category: { id: string; name: string; slug: string };
  }>;
  tags: Array<{
    tagId: string;
    tag: { id: string; name: string; nameFa: string; slug: string };
  }>;
  media: Array<{
    mediaId: string;
    position: number;
    media: Parameters<typeof mapMediaRow>[0];
  }>;
};

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) return null;
  return Number(value.toString());
}

function mapProductCategories(rows: ProductRow["categories"]) {
  return rows.map((row) => ({
    id: row.category.id,
    name: row.category.name,
    slug: row.category.slug,
    position: row.position,
  }));
}

function mapProductMedia(rows: ProductRow["media"]) {
  return rows.map((row) => ({
    ...mapMediaRow(row.media),
    position: row.position,
  }));
}

function mapProductTags(rows: ProductRow["tags"]) {
  return rows.map((row) => ({
    id: row.tag.id,
    name: row.tag.name,
    nameFa: row.tag.nameFa,
    slug: row.tag.slug,
  }));
}

function mapProduct(product: ProductRow) {
  const gallery = mapProductMedia(product.media);
  const featured = gallery[0] ?? null;
  const linkedCategories = mapProductCategories(product.categories);
  const categories =
    linkedCategories.length > 0
      ? linkedCategories
      : product.category
        ? [
            {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
              position: 0,
            },
          ]
        : [];
  const categoryIds = categories.map((item) => item.id);

  return {
    id: product.id,
    categoryId: product.categoryId,
    categoryIds: categories.map((item) => item.id),
    categories,
    tagIds: mapProductTags(product.tags).map((item) => item.id),
    tags: mapProductTags(product.tags),
    brandId: product.brandId,
    title: product.title,
    slug: product.slug,
    description: product.description,
    descriptionBlocks: Array.isArray(product.descriptionBlocks)
      ? product.descriptionBlocks
      : [],
    productType: product.productType,
    status: product.status,
    basePrice: decimalToNumber(product.basePrice),
    comparePrice: decimalToNumber(product.comparePrice),
    isRefundable: product.isRefundable,
    isFeatured: product.isFeatured,
    popularityScore: product.popularityScore,
    category: product.category,
    brand: product.brand,
    featuredImageId: featured?.id ?? null,
    featuredImage: featured,
    media: gallery,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
    ogImageId: product.ogImageId,
    ogImage: product.ogImage ? mapMediaRow(product.ogImage) : null,
    canonicalUrl: product.canonicalUrl,
    metaRobots: product.metaRobots,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function resolveMediaIds(data: ProductWriteInput): string[] | undefined {
  if (data.mediaIds !== undefined) {
    return [...new Set(data.mediaIds.filter(Boolean))];
  }
  if (data.featuredImageId !== undefined) {
    return data.featuredImageId ? [data.featuredImageId] : [];
  }
  return undefined;
}

function resolveCategoryState(data: ProductWriteInput) {
  if (data.categoryIds !== undefined || data.categoryId !== undefined) {
    const ids = data.categoryIds ?? (data.categoryId ? [data.categoryId] : []);
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    let primaryId = data.categoryId ?? null;
    if (primaryId && !uniqueIds.includes(primaryId)) {
      uniqueIds.unshift(primaryId);
    }
    if (!primaryId && uniqueIds.length > 0) {
      primaryId = uniqueIds[0];
    }
    return { categoryIds: uniqueIds, categoryId: primaryId };
  }
  return undefined;
}

async function syncProductMedia(productId: string, mediaIds: string[]) {
  await prisma.$transaction(async (tx) => {
    await tx.productMedia.updateMany({
      where: { productId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    for (let index = 0; index < mediaIds.length; index += 1) {
      const mediaId = mediaIds[index];
      await tx.productMedia.upsert({
        where: { productId_mediaId: { productId, mediaId } },
        create: { productId, mediaId, position: index },
        update: { deletedAt: null, position: index },
      });
    }
  });
}

async function syncProductCategories(productId: string, categoryIds: string[]) {
  if (categoryIds.length) {
    const virtual = await prisma.category.findMany({
      where: { id: { in: categoryIds }, kind: "virtual", deletedAt: null },
      select: { id: true },
    });
    if (virtual.length) {
      throw new Error("VIRTUAL_CATEGORY_NOT_ALLOWED");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.productCategory.deleteMany({ where: { productId } });
    if (categoryIds.length === 0) return;

    await tx.productCategory.createMany({
      data: categoryIds.map((categoryId, position) => ({
        productId,
        categoryId,
        position,
      })),
    });
  });
}

export async function listProducts(filters: ProductListFilters = {}) {
  const q = filters.q?.trim();
  const rows = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.productType ? { productType: filters.productType } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.categoryId
        ? {
            OR: [
              { categoryId: filters.categoryId },
              { categories: { some: { categoryId: filters.categoryId } } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: productInclude,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });
  return rows.map(mapProduct);
}

export async function findProductById(id: string) {
  const row = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: productInclude,
  });
  return row ? mapProduct(row) : null;
}

export async function findProductDetailById(id: string) {
  const product = await findProductById(id);
  if (!product) return null;

  const [options, variants, priceHistory, productHistory] = await Promise.all([
    listProductOptions(id),
    listProductVariants(id),
    listProductPriceHistory(id),
    listProductSnapshots(id),
  ]);

  return {
    ...product,
    options,
    variants,
    priceHistory,
    productHistory,
  };
}

export async function createProduct(
  data: Required<Pick<ProductWriteInput, "title" | "slug">> & ProductWriteInput,
) {
  const categoryState = resolveCategoryState(data);
  const mediaIds = resolveMediaIds(data);

  const row = await prisma.product.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description ?? null,
      descriptionBlocks: (data.descriptionBlocks ?? []) as object,
      productType: data.productType ?? "physical",
      status: data.status ?? "draft",
      categoryId: categoryState?.categoryId ?? data.categoryId ?? null,
      brandId: data.brandId ?? null,
      basePrice: data.basePrice ?? null,
      comparePrice: data.comparePrice ?? null,
      isRefundable: data.isRefundable ?? true,
      isFeatured: data.isFeatured ?? false,
      popularityScore: data.popularityScore ?? 0,
      seoTitle: data.seoTitle ?? null,
      seoDescription: data.seoDescription ?? null,
      ogTitle: data.ogTitle ?? null,
      ogDescription: data.ogDescription ?? null,
      ogImageId: data.ogImageId ?? null,
      canonicalUrl: data.canonicalUrl ?? null,
      metaRobots: data.metaRobots ?? "index,follow",
    },
    include: productInclude,
  });

  if (categoryState) {
    await syncProductCategories(row.id, categoryState.categoryIds);
  } else if (data.categoryId) {
    await syncProductCategories(row.id, [data.categoryId]);
  }

  if (mediaIds !== undefined) {
    await syncProductMedia(row.id, mediaIds);
  }

  if (data.tagIds !== undefined) {
    await syncProductTags(row.id, data.tagIds);
  }

  if (data.variants !== undefined) {
    await syncProductVariants(row.id, data.variants);
  }

  const refreshed = await findProductById(row.id);
  return refreshed!;
}

export async function updateProduct(id: string, data: ProductWriteInput) {
  const categoryState = resolveCategoryState(data);
  const mediaIds = resolveMediaIds(data);

  await prisma.product.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.descriptionBlocks !== undefined
        ? { descriptionBlocks: data.descriptionBlocks as object }
        : {}),
      ...(data.productType !== undefined ? { productType: data.productType } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(categoryState
        ? { categoryId: categoryState.categoryId }
        : data.categoryId !== undefined
          ? { categoryId: data.categoryId }
          : {}),
      ...(data.brandId !== undefined ? { brandId: data.brandId } : {}),
      ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : {}),
      ...(data.comparePrice !== undefined ? { comparePrice: data.comparePrice } : {}),
      ...(data.isRefundable !== undefined ? { isRefundable: data.isRefundable } : {}),
      ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      ...(data.popularityScore !== undefined ? { popularityScore: data.popularityScore } : {}),
      ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
      ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
      ...(data.ogTitle !== undefined ? { ogTitle: data.ogTitle } : {}),
      ...(data.ogDescription !== undefined ? { ogDescription: data.ogDescription } : {}),
      ...(data.ogImageId !== undefined ? { ogImageId: data.ogImageId } : {}),
      ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl } : {}),
      ...(data.metaRobots !== undefined ? { metaRobots: data.metaRobots } : {}),
    },
  });

  if (categoryState) {
    await syncProductCategories(id, categoryState.categoryIds);
  } else if (data.categoryId !== undefined) {
    await syncProductCategories(id, data.categoryId ? [data.categoryId] : []);
  }

  if (mediaIds !== undefined) {
    await syncProductMedia(id, mediaIds);
  }

  if (data.tagIds !== undefined) {
    await syncProductTags(id, data.tagIds);
  }

  if (data.variants !== undefined) {
    await syncProductVariants(id, data.variants);
  }

  const refreshed = await findProductById(id);
  return refreshed!;
}

export async function softDeleteProduct(id: string) {
  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function productSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.product.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

export function productAuditSnapshot(product: Awaited<ReturnType<typeof findProductById>>) {
  if (!product) return null;
  return {
    title: product.title,
    slug: product.slug,
    productType: product.productType,
    status: product.status,
    basePrice: product.basePrice,
    categoryId: product.categoryId,
    categoryIds: product.categoryIds,
    brandId: product.brandId,
    mediaCount: product.media.length,
    tagCount: product.tags.length,
  };
}

export type { ProductVariantsPayload };
