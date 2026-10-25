import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createCategory,
  findCategoryById,
  listCategories,
  reorderCategories,
  slugExists,
  softDeleteCategory,
  updateCategory,
} from "@/lib/db/repositories/category.repository";
import { optionalUuidSchema, uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { CategoryDto, CategoryReorderItem } from "@/types/domain";

const slugSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const seoSchema = {
  seoTitle: z.string().max(180).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  ogTitle: z.string().max(180).nullable().optional(),
  ogDescription: z.string().max(320).nullable().optional(),
  ogImageId: z.union([optionalUuidSchema, z.null()]).optional(),
  canonicalUrl: z.string().max(500).nullable().optional(),
  metaRobots: z.string().max(60).optional(),
};

const descriptionBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), body: z.string() }),
  z.object({ type: z.literal("checklist"), items: z.array(z.string()) }),
  z.object({
    type: z.literal("table"),
    rows: z.array(z.object({ label: z.string(), value: z.string() })),
  }),
]);

const shopPageFiltersSchema = z
  .object({
    q: z.string().optional(),
    category: z.array(z.string()).optional(),
    audience: z.array(z.enum(["men", "women", "kids"])).optional(),
    color: z.array(z.string()).optional(),
    size: z.array(z.number()).optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    sale: z.boolean().optional(),
    inStock: z.boolean().optional(),
    featured: z.boolean().optional(),
    tag: z.array(z.string()).optional(),
    brand: z.array(z.string()).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "popular", "discount"]).optional(),
  })
  .passthrough();

const createCategorySchema = z.object({
  name: z.string().min(1).max(150),
  nameFa: z.string().min(1).max(150),
  slug: slugSchema.optional(),
  description: z.string().max(2000).nullable().optional(),
  kind: z.enum(["real", "virtual"]).optional(),
  menuVisible: z.boolean().optional(),
  filters: shopPageFiltersSchema.optional(),
  descriptionBlocks: z.array(descriptionBlockSchema).optional(),
  pageSettings: z
    .object({
      bannerEnabled: z.boolean().optional(),
      bannerTitle: z.string().max(200).optional(),
      bannerSubtitle: z.string().max(500).optional(),
      showProductCount: z.boolean().optional(),
    })
    .optional(),
  parentId: optionalUuidSchema,
  imageId: optionalUuidSchema,
  galleryMediaIds: z.array(uuidSchema).optional(),
  pinnedProductIds: z.array(uuidSchema).optional(),
  position: z.coerce.number().int().min(0).optional(),
  ...seoSchema,
});

const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    nameFa: z.string().min(1).max(150).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    kind: z.enum(["real", "virtual"]).optional(),
    menuVisible: z.boolean().optional(),
    filters: shopPageFiltersSchema.optional(),
    descriptionBlocks: z.array(descriptionBlockSchema).optional(),
    pageSettings: z
      .object({
        bannerEnabled: z.boolean().optional(),
        bannerTitle: z.string().max(200).optional(),
        bannerSubtitle: z.string().max(500).optional(),
        showProductCount: z.boolean().optional(),
      })
      .optional(),
    parentId: z.union([optionalUuidSchema, z.null()]).optional(),
    imageId: z.union([optionalUuidSchema, z.null()]).optional(),
    galleryMediaIds: z.array(uuidSchema).optional(),
    pinnedProductIds: z.array(uuidSchema).optional(),
    position: z.coerce.number().int().min(0).optional(),
    ...seoSchema,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        parentId: z.union([uuidSchema, z.null()]),
        position: z.number().int().min(0),
      }),
    )
    .min(1),
});

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveUniqueSlug(name: string, provided?: string, excludeId?: string) {
  const base = provided?.trim() || slugify(name);
  if (!base) return null;

  let candidate = base;
  let suffix = 2;
  while (await slugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function listCategoriesHandler(): Promise<ApiResponse<CategoryDto[]>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const data = await listCategories();
  return { success: true, data };
}

export async function getCategoryHandler(ctx: BffContext): Promise<ApiResponse<CategoryDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid category id" } };
  }

  const data = await findCategoryById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  }

  return { success: true, data };
}

export async function createCategoryHandler(body: unknown): Promise<ApiResponse<CategoryDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const slug = await resolveUniqueSlug(parsed.data.name, parsed.data.slug);
  if (!slug) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Could not generate slug" } };
  }

  try {
    const data = await createCategory({
      name: parsed.data.name,
      nameFa: parsed.data.nameFa,
      slug,
      description: parsed.data.description ?? null,
      kind: parsed.data.kind,
      menuVisible: parsed.data.menuVisible,
      filters: parsed.data.filters,
      descriptionBlocks: parsed.data.descriptionBlocks,
      pageSettings: parsed.data.pageSettings,
      parentId: parsed.data.parentId ?? null,
      imageId: parsed.data.imageId ?? null,
      galleryMediaIds: parsed.data.galleryMediaIds,
      pinnedProductIds: parsed.data.pinnedProductIds,
      position: parsed.data.position,
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
      action: "category.created",
      entityType: "category",
      entityId: data.id,
      snapshot: {
        name: data.name,
        nameFa: data.nameFa,
        slug: data.slug,
        kind: data.kind,
        parentId: data.parentId,
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

export async function updateCategoryHandler(ctx: BffContext): Promise<ApiResponse<CategoryDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid category id" } };
  }

  const existing = await findCategoryById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  }

  const parsed = updateCategorySchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  let slug = parsed.data.slug;
  if (slug) {
    if (await slugExists(slug, id)) {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
  } else if (parsed.data.name) {
    const nextSlug = await resolveUniqueSlug(parsed.data.name, undefined, id);
    if (nextSlug) slug = nextSlug;
  }

  if (parsed.data.parentId === id) {
    return { success: false, error: { code: "BUSINESS_RULE", message: "Category cannot be its own parent" } };
  }

  try {
    const data = await updateCategory(id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.nameFa !== undefined ? { nameFa: parsed.data.nameFa } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
      ...(parsed.data.menuVisible !== undefined ? { menuVisible: parsed.data.menuVisible } : {}),
      ...(parsed.data.filters !== undefined ? { filters: parsed.data.filters } : {}),
      ...(parsed.data.descriptionBlocks !== undefined
        ? { descriptionBlocks: parsed.data.descriptionBlocks }
        : {}),
      ...(parsed.data.pageSettings !== undefined
        ? { pageSettings: parsed.data.pageSettings }
        : {}),
      ...(parsed.data.parentId !== undefined ? { parentId: parsed.data.parentId } : {}),
      ...(parsed.data.imageId !== undefined ? { imageId: parsed.data.imageId } : {}),
      ...(parsed.data.galleryMediaIds !== undefined
        ? { galleryMediaIds: parsed.data.galleryMediaIds }
        : {}),
      ...(parsed.data.pinnedProductIds !== undefined
        ? { pinnedProductIds: parsed.data.pinnedProductIds }
        : {}),
      ...(parsed.data.position !== undefined ? { position: parsed.data.position } : {}),
      ...(parsed.data.seoTitle !== undefined ? { seoTitle: parsed.data.seoTitle } : {}),
      ...(parsed.data.seoDescription !== undefined
        ? { seoDescription: parsed.data.seoDescription }
        : {}),
      ...(parsed.data.ogTitle !== undefined ? { ogTitle: parsed.data.ogTitle } : {}),
      ...(parsed.data.ogDescription !== undefined ? { ogDescription: parsed.data.ogDescription } : {}),
      ...(parsed.data.ogImageId !== undefined ? { ogImageId: parsed.data.ogImageId } : {}),
      ...(parsed.data.canonicalUrl !== undefined ? { canonicalUrl: parsed.data.canonicalUrl } : {}),
      ...(parsed.data.metaRobots !== undefined ? { metaRobots: parsed.data.metaRobots } : {}),
    });
    if (!data) {
      return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
    }
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "category.updated",
      entityType: "category",
      entityId: data.id,
      snapshot: {
        before: {
          name: existing.name,
          slug: existing.slug,
          kind: existing.kind,
          parentId: existing.parentId,
        },
        after: { name: data.name, slug: data.slug, kind: data.kind, parentId: data.parentId },
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

export async function reorderCategoriesHandler(body: unknown): Promise<ApiResponse<CategoryDto[]>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const items = parsed.data.items as CategoryReorderItem[];
  const ids = new Set(items.map((i) => i.id));
  for (const item of items) {
    if (item.parentId && item.parentId === item.id) {
      return {
        success: false,
        error: { code: "BUSINESS_RULE", message: "Category cannot be its own parent" },
      };
    }
    if (item.parentId && !ids.has(item.parentId)) {
      const parent = await findCategoryById(item.parentId);
      if (!parent) {
        return { success: false, error: { code: "NOT_FOUND", message: "Parent category not found" } };
      }
    }
  }

  const data = await reorderCategories(items);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "category.reordered",
    entityType: "category",
    entityId: items[0]?.id ?? null,
    snapshot: { count: items.length },
  });
  return { success: true, data };
}

export async function deleteCategoryHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid category id" } };
  }

  const existing = await findCategoryById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  }

  await softDeleteCategory(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "category.deleted",
    entityType: "category",
    entityId: id,
    snapshot: { name: existing.name, nameFa: existing.nameFa, slug: existing.slug },
  });
  return { success: true, data: { ok: true } };
}
