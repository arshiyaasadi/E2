import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createProduct,
  findProductById,
  findProductDetailById,
  listProducts,
  productAuditSnapshot,
  productSlugExists,
  softDeleteProduct,
  updateProduct,
} from "@/lib/db/repositories/product.repository";
import { optionalUuidSchema, uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { ProductDetailDto, ProductDto } from "@/types/domain";

const slugSchema = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const productStatusSchema = z.enum(["draft", "active", "archived"]);
const productTypeSchema = z.enum(["physical", "digital"]);

const seoSchema = {
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  ogTitle: z.string().max(180).nullable().optional(),
  ogDescription: z.string().max(320).nullable().optional(),
  ogImageId: z.union([optionalUuidSchema, z.null()]).optional(),
  canonicalUrl: z.string().max(500).nullable().optional(),
  metaRobots: z.string().max(60).optional(),
};

const priceSchema = z.coerce.number().min(0).nullable().optional();

const categoryIdsSchema = z.array(uuidSchema).optional();

const optionValueSchema = z.object({
  id: optionalUuidSchema.optional(),
  key: z.string().min(1).max(80).optional(),
  value: z.string().min(1).max(80),
  position: z.number().int().min(0),
});

const productOptionSchema = z.object({
  id: optionalUuidSchema.optional(),
  name: z.string().min(1).max(60),
  position: z.number().int().min(0),
  values: z.array(optionValueSchema).min(1),
});

const productVariantSchema = z.object({
  id: optionalUuidSchema.optional(),
  sku: z.string().min(1).max(80),
  price: priceSchema,
  comparePrice: priceSchema,
  mediaId: z.union([optionalUuidSchema, z.null()]).optional(),
  isDefault: z.boolean().optional(),
  optionValueKeys: z.array(z.string().min(1)),
});

const variantsPayloadSchema = z.object({
  options: z.array(productOptionSchema),
  variants: z.array(productVariantSchema),
});

const descriptionBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), body: z.string() }),
  z.object({ type: z.literal("checklist"), items: z.array(z.string()) }),
  z.object({
    type: z.literal("table"),
    rows: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
]);

const createProductSchema = z.object({
  title: z.string().min(1).max(200),
  slug: slugSchema.optional(),
  description: z.string().max(10000).nullable().optional(),
  descriptionBlocks: z.array(descriptionBlockSchema).optional(),
  productType: productTypeSchema.optional(),
  status: productStatusSchema.optional(),
  categoryId: z.union([optionalUuidSchema, z.null()]).optional(),
  categoryIds: categoryIdsSchema,
  brandId: optionalUuidSchema,
  basePrice: priceSchema,
  comparePrice: priceSchema,
  isRefundable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  popularityScore: z.coerce.number().int().min(0).optional(),
  featuredImageId: z.union([optionalUuidSchema, z.null()]).optional(),
  mediaIds: categoryIdsSchema,
  tagIds: categoryIdsSchema,
  variants: variantsPayloadSchema.optional(),
  ...seoSchema,
});

const updateProductSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(10000).nullable().optional(),
    descriptionBlocks: z.array(descriptionBlockSchema).optional(),
    productType: productTypeSchema.optional(),
    status: productStatusSchema.optional(),
    categoryId: z.union([optionalUuidSchema, z.null()]).optional(),
    categoryIds: categoryIdsSchema,
    brandId: z.union([optionalUuidSchema, z.null()]).optional(),
    basePrice: priceSchema,
    comparePrice: priceSchema,
    isRefundable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    popularityScore: z.coerce.number().int().min(0).optional(),
    featuredImageId: z.union([optionalUuidSchema, z.null()]).optional(),
    mediaIds: categoryIdsSchema,
    tagIds: categoryIdsSchema,
    variants: variantsPayloadSchema.optional(),
    ...seoSchema,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveUniqueSlug(title: string, provided?: string, excludeId?: string) {
  const base = provided?.trim() || slugify(title);
  if (!base) return null;

  let candidate = base;
  let suffix = 2;
  while (await productSlugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function parseListFilters(searchParams: URLSearchParams) {
  const status = searchParams.get("status");
  const productType = searchParams.get("productType");
  const brandId = searchParams.get("brandId");
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q") ?? undefined;

  return {
    q,
    ...(status && productStatusSchema.safeParse(status).success
      ? { status: status as z.infer<typeof productStatusSchema> }
      : {}),
    ...(productType && productTypeSchema.safeParse(productType).success
      ? { productType: productType as z.infer<typeof productTypeSchema> }
      : {}),
    ...(brandId && uuidSchema.safeParse(brandId).success ? { brandId } : {}),
    ...(categoryId && uuidSchema.safeParse(categoryId).success ? { categoryId } : {}),
  };
}

export async function listProductsHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<ProductDto[]>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const data = await listProducts(parseListFilters(searchParams));
  return { success: true, data };
}

export async function getProductHandler(ctx: BffContext): Promise<ApiResponse<ProductDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid product id" } };
  }

  const data = await findProductById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
  }

  return { success: true, data };
}

export async function getProductDetailHandler(
  ctx: BffContext,
): Promise<ApiResponse<ProductDetailDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid product id" } };
  }

  const data = await findProductDetailById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
  }

  return { success: true, data };
}

export async function createProductHandler(body: unknown): Promise<ApiResponse<ProductDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const slug = await resolveUniqueSlug(parsed.data.title, parsed.data.slug);
  if (!slug) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Could not generate slug" } };
  }

  const productType = parsed.data.productType ?? "physical";
  const isRefundable =
    parsed.data.isRefundable ?? (productType === "physical" ? true : false);

  try {
    const data = await createProduct({
      title: parsed.data.title,
      slug,
      description: parsed.data.description ?? null,
      descriptionBlocks: parsed.data.descriptionBlocks,
      productType,
      status: parsed.data.status ?? "draft",
      categoryId: parsed.data.categoryId ?? null,
      categoryIds: parsed.data.categoryIds,
      brandId: parsed.data.brandId ?? null,
      basePrice: parsed.data.basePrice ?? null,
      comparePrice: parsed.data.comparePrice ?? null,
      isRefundable,
      isFeatured: parsed.data.isFeatured ?? false,
      popularityScore: parsed.data.popularityScore ?? 0,
      featuredImageId: parsed.data.featuredImageId ?? null,
      mediaIds: parsed.data.mediaIds,
      tagIds: parsed.data.tagIds,
      variants: parsed.data.variants,
      seoTitle: parsed.data.seoTitle ?? null,
      seoDescription: parsed.data.seoDescription ?? null,
      ogTitle: parsed.data.ogTitle ?? null,
      ogDescription: parsed.data.ogDescription ?? null,
      ogImageId: parsed.data.ogImageId ?? null,
      canonicalUrl: parsed.data.canonicalUrl ?? null,
      metaRobots: parsed.data.metaRobots,
    });

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "product.created",
      entityType: "product",
      entityId: data.id,
      snapshot: productAuditSnapshot(data),
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateProductHandler(ctx: BffContext): Promise<ApiResponse<ProductDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid product id" } };
  }

  const existing = await findProductById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
  }

  const parsed = updateProductSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  let slug = parsed.data.slug;
  if (slug) {
    if (await productSlugExists(slug, id)) {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
  } else if (parsed.data.title) {
    const nextSlug = await resolveUniqueSlug(parsed.data.title, undefined, id);
    if (nextSlug) slug = nextSlug;
  }

  const nextProductType = parsed.data.productType ?? existing.productType;
  let isRefundable = parsed.data.isRefundable;
  if (isRefundable === undefined && parsed.data.productType === "digital") {
    isRefundable = false;
  }

  try {
    const data = await updateProduct(id, {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.descriptionBlocks !== undefined
        ? { descriptionBlocks: parsed.data.descriptionBlocks }
        : {}),
      ...(parsed.data.productType !== undefined ? { productType: parsed.data.productType } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
      ...(parsed.data.categoryIds !== undefined ? { categoryIds: parsed.data.categoryIds } : {}),
      ...(parsed.data.brandId !== undefined ? { brandId: parsed.data.brandId } : {}),
      ...(parsed.data.basePrice !== undefined ? { basePrice: parsed.data.basePrice } : {}),
      ...(parsed.data.comparePrice !== undefined ? { comparePrice: parsed.data.comparePrice } : {}),
      ...(isRefundable !== undefined ? { isRefundable } : {}),
      ...(parsed.data.isFeatured !== undefined ? { isFeatured: parsed.data.isFeatured } : {}),
      ...(parsed.data.popularityScore !== undefined
        ? { popularityScore: parsed.data.popularityScore }
        : {}),
      ...(parsed.data.featuredImageId !== undefined ? { featuredImageId: parsed.data.featuredImageId } : {}),
      ...(parsed.data.mediaIds !== undefined ? { mediaIds: parsed.data.mediaIds } : {}),
      ...(parsed.data.tagIds !== undefined ? { tagIds: parsed.data.tagIds } : {}),
      ...(parsed.data.variants !== undefined ? { variants: parsed.data.variants } : {}),
      ...(parsed.data.seoTitle !== undefined ? { seoTitle: parsed.data.seoTitle } : {}),
      ...(parsed.data.seoDescription !== undefined ? { seoDescription: parsed.data.seoDescription } : {}),
      ...(parsed.data.ogTitle !== undefined ? { ogTitle: parsed.data.ogTitle } : {}),
      ...(parsed.data.ogDescription !== undefined ? { ogDescription: parsed.data.ogDescription } : {}),
      ...(parsed.data.ogImageId !== undefined ? { ogImageId: parsed.data.ogImageId } : {}),
      ...(parsed.data.canonicalUrl !== undefined ? { canonicalUrl: parsed.data.canonicalUrl } : {}),
      ...(parsed.data.metaRobots !== undefined ? { metaRobots: parsed.data.metaRobots } : {}),
    });

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "product.updated",
      entityType: "product",
      entityId: data.id,
      snapshot: {
        before: productAuditSnapshot(existing),
        after: productAuditSnapshot(data),
        productType: nextProductType,
      },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function deleteProductHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid product id" } };
  }

  const existing = await findProductById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
  }

  await softDeleteProduct(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "product.deleted",
    entityType: "product",
    entityId: id,
    snapshot: productAuditSnapshot(existing),
  });
  return { success: true, data: { ok: true } };
}
