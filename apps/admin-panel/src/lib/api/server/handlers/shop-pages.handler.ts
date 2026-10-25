import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createShopPage,
  findShopPageById,
  listShopPages,
  shopPageMapsCategorySlugExists,
  shopPageSlugExists,
  softDeleteShopPage,
  updateShopPage,
} from "@/lib/db/repositories/shop-page.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { ShopPageDto } from "@/types/domain";

const slugSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const shopPageTypeSchema = z.enum(["search", "landing"]);
const shopPageStatusSchema = z.enum(["draft", "published"]);

const jsonObjectSchema = z.record(z.string(), z.unknown());
const jsonArraySchema = z.array(z.unknown());

const createShopPageSchema = z.object({
  title: z.string().min(1).max(200),
  titleFa: z.string().max(200).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  slug: slugSchema.optional(),
  type: shopPageTypeSchema,
  status: shopPageStatusSchema.optional(),
  isMain: z.boolean().optional(),
  mapsCategorySlug: z.string().max(180).nullable().optional(),
  filters: jsonObjectSchema.optional(),
  pinnedProductIds: z.array(uuidSchema).optional(),
  blocks: jsonArraySchema.optional(),
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  seoImageId: z.union([uuidSchema, z.null()]).optional(),
});

const updateShopPageSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    titleFa: z.string().max(200).nullable().optional(),
    description: z.string().max(10000).nullable().optional(),
    slug: slugSchema.optional(),
    type: shopPageTypeSchema.optional(),
    status: shopPageStatusSchema.optional(),
    isMain: z.boolean().optional(),
    mapsCategorySlug: z.string().max(180).nullable().optional(),
    filters: jsonObjectSchema.optional(),
    pinnedProductIds: z.array(uuidSchema).optional(),
    blocks: jsonArraySchema.optional(),
    seoTitle: z.string().max(180).nullable().optional(),
    seoDescription: z.string().max(320).nullable().optional(),
    seoImageId: z.union([uuidSchema, z.null()]).optional(),
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
  while (await shopPageSlugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function resolvePublishedAt(
  status: "draft" | "published" | undefined,
  existingPublishedAt: string | null,
) {
  if (status !== "published") return undefined;
  if (existingPublishedAt) return undefined;
  return new Date();
}

function auditSnapshot(page: ShopPageDto) {
  return {
    title: page.title,
    slug: page.slug,
    type: page.type,
    status: page.status,
    isMain: page.isMain,
  };
}

export async function listShopPagesHandler(): Promise<ApiResponse<ShopPageDto[]>> {
  const auth = await requirePermission("shop_pages.view");
  if (!auth.ok) return auth.response;

  const data = await listShopPages();
  return { success: true, data };
}

export async function getShopPageHandler(ctx: BffContext): Promise<ApiResponse<ShopPageDto>> {
  const auth = await requirePermission("shop_pages.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shop page id" } };
  }

  const data = await findShopPageById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shop page not found" } };
  }

  return { success: true, data };
}

export async function createShopPageHandler(body: unknown): Promise<ApiResponse<ShopPageDto>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const parsed = createShopPageSchema.safeParse(body);
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

  const mapsCategorySlug = parsed.data.mapsCategorySlug?.trim() || null;
  if (mapsCategorySlug && (await shopPageMapsCategorySlugExists(mapsCategorySlug))) {
    return {
      success: false,
      error: { code: "CONFLICT", message: "Category slug mapping already in use" },
    };
  }

  const status = parsed.data.status ?? "draft";
  const publishedAt = status === "published" ? new Date() : null;

  try {
    const data = await createShopPage({
      title: parsed.data.title,
      titleFa: parsed.data.titleFa ?? null,
      description: parsed.data.description ?? null,
      slug,
      type: parsed.data.type,
      status,
      isMain: parsed.data.isMain ?? false,
      mapsCategorySlug,
      filters: (parsed.data.filters ?? {}) as Prisma.InputJsonValue,
      pinnedProductIds: (parsed.data.pinnedProductIds ?? []) as Prisma.InputJsonValue,
      blocks: (parsed.data.blocks ?? []) as Prisma.InputJsonValue,
      seoTitle: parsed.data.seoTitle ?? null,
      seoDescription: parsed.data.seoDescription ?? null,
      seoImageId: parsed.data.seoImageId ?? null,
      publishedAt,
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "shop_page.created",
      entityType: "shop_page",
      entityId: data.id,
      snapshot: auditSnapshot(data),
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug or category mapping already exists" } };
    }
    throw error;
  }
}

export async function updateShopPageHandler(ctx: BffContext): Promise<ApiResponse<ShopPageDto>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shop page id" } };
  }

  const existing = await findShopPageById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shop page not found" } };
  }

  const parsed = updateShopPageSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  let slug = parsed.data.slug;
  if (slug) {
    if (await shopPageSlugExists(slug, id)) {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
  } else if (parsed.data.title) {
    const nextSlug = await resolveUniqueSlug(parsed.data.title, undefined, id);
    if (nextSlug) slug = nextSlug;
  }

  let mapsCategorySlug = parsed.data.mapsCategorySlug;
  if (mapsCategorySlug !== undefined) {
    mapsCategorySlug = mapsCategorySlug?.trim() || null;
    if (mapsCategorySlug && (await shopPageMapsCategorySlugExists(mapsCategorySlug, id))) {
      return {
        success: false,
        error: { code: "CONFLICT", message: "Category slug mapping already in use" },
      };
    }
  }

  const publishedAt = resolvePublishedAt(parsed.data.status, existing.publishedAt);

  try {
    const data = await updateShopPage(id, {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.titleFa !== undefined ? { titleFa: parsed.data.titleFa } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.isMain !== undefined ? { isMain: parsed.data.isMain } : {}),
      ...(mapsCategorySlug !== undefined ? { mapsCategorySlug } : {}),
      ...(parsed.data.filters !== undefined
        ? { filters: parsed.data.filters as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.pinnedProductIds !== undefined
        ? { pinnedProductIds: parsed.data.pinnedProductIds as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.blocks !== undefined
        ? { blocks: parsed.data.blocks as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.seoTitle !== undefined ? { seoTitle: parsed.data.seoTitle } : {}),
      ...(parsed.data.seoDescription !== undefined ? { seoDescription: parsed.data.seoDescription } : {}),
      ...(parsed.data.seoImageId !== undefined ? { seoImageId: parsed.data.seoImageId } : {}),
      ...(publishedAt !== undefined ? { publishedAt } : {}),
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "shop_page.updated",
      entityType: "shop_page",
      entityId: data.id,
      snapshot: auditSnapshot(data),
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug or category mapping already exists" } };
    }
    throw error;
  }
}

export async function deleteShopPageHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shop page id" } };
  }

  const existing = await findShopPageById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shop page not found" } };
  }

  await softDeleteShopPage(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "shop_page.deleted",
    entityType: "shop_page",
    entityId: id,
    snapshot: auditSnapshot(existing),
  });
  return { success: true, data: { ok: true } };
}
