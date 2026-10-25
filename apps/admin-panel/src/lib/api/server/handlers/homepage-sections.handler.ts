import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createHomepageSection,
  findHomepageSectionById,
  listHomepageSections,
  softDeleteHomepageSection,
  swapHomepageSectionOrder,
  updateHomepageSection,
} from "@/lib/db/repositories/homepage-section.repository";
import { findShopPageById } from "@/lib/db/repositories/shop-page.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { HomepageSectionDto } from "@/types/domain";

const sectionTypeSchema = z.enum(["product_grid", "product_rail", "sale_grid"]);
const gridLayoutSchema = z.enum(["cols3", "cols4"]);
const jsonObjectSchema = z.record(z.string(), z.unknown());

const createSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).nullable().optional(),
  sectionType: sectionTypeSchema,
  filters: jsonObjectSchema.optional(),
  shopPageId: z.string().uuid().nullable().optional(),
  productLimit: z.number().int().min(1).max(48).optional(),
  gridLayout: gridLayoutSchema.optional(),
  sortOrder: z.number().int().optional(),
  isEnabled: z.boolean().optional(),
});

const updateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    subtitle: z.string().max(300).nullable().optional(),
    sectionType: sectionTypeSchema.optional(),
    filters: jsonObjectSchema.optional(),
    shopPageId: z.string().uuid().nullable().optional(),
    productLimit: z.number().int().min(1).max(48).optional(),
    gridLayout: gridLayoutSchema.optional(),
    sortOrder: z.number().int().optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

const reorderSchema = z.object({
  otherId: z.string().uuid(),
});

function auditSnapshot(section: HomepageSectionDto) {
  return {
    title: section.title,
    sectionType: section.sectionType,
    sortOrder: section.sortOrder,
    isEnabled: section.isEnabled,
  };
}

async function assertShopPage(shopPageId: string | null | undefined) {
  if (!shopPageId) return true;
  const page = await findShopPageById(shopPageId);
  return Boolean(page);
}

export async function listHomepageSectionsHandler(): Promise<ApiResponse<HomepageSectionDto[]>> {
  const auth = await requirePermission("shop_pages.view");
  if (!auth.ok) return auth.response;

  const data = await listHomepageSections();
  return { success: true, data };
}

export async function getHomepageSectionHandler(
  ctx: BffContext,
): Promise<ApiResponse<HomepageSectionDto>> {
  const auth = await requirePermission("shop_pages.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid section id" } };
  }

  const data = await findHomepageSectionById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Homepage section not found" } };
  }

  return { success: true, data };
}

export async function createHomepageSectionHandler(
  body: unknown,
): Promise<ApiResponse<HomepageSectionDto>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
    };
  }

  const shopPageId = parsed.data.shopPageId ?? null;
  if (!(await assertShopPage(shopPageId))) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shop page not found" } };
  }

  const data = await createHomepageSection({
    title: parsed.data.title,
    subtitle: parsed.data.subtitle ?? null,
    sectionType: parsed.data.sectionType,
    filters: (parsed.data.filters ?? {}) as Prisma.InputJsonValue,
    shopPageId,
    productLimit: parsed.data.productLimit,
    gridLayout: parsed.data.gridLayout,
    sortOrder: parsed.data.sortOrder,
    isEnabled: parsed.data.isEnabled,
  });

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "homepage_section.created",
    entityType: "shop_page",
    entityId: data.id,
    snapshot: auditSnapshot(data),
  });

  return { success: true, data };
}

export async function updateHomepageSectionHandler(
  ctx: BffContext,
): Promise<ApiResponse<HomepageSectionDto>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid section id" } };
  }

  const existing = await findHomepageSectionById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Homepage section not found" } };
  }

  const parsed = updateSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
    };
  }

  if (parsed.data.shopPageId !== undefined && !(await assertShopPage(parsed.data.shopPageId))) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shop page not found" } };
  }

  const data = await updateHomepageSection(id, {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.subtitle !== undefined ? { subtitle: parsed.data.subtitle } : {}),
    ...(parsed.data.sectionType !== undefined ? { sectionType: parsed.data.sectionType } : {}),
    ...(parsed.data.filters !== undefined
      ? { filters: parsed.data.filters as Prisma.InputJsonValue }
      : {}),
    ...(parsed.data.shopPageId !== undefined ? { shopPageId: parsed.data.shopPageId } : {}),
    ...(parsed.data.productLimit !== undefined ? { productLimit: parsed.data.productLimit } : {}),
    ...(parsed.data.gridLayout !== undefined ? { gridLayout: parsed.data.gridLayout } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    ...(parsed.data.isEnabled !== undefined ? { isEnabled: parsed.data.isEnabled } : {}),
  });

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "homepage_section.updated",
    entityType: "shop_page",
    entityId: data.id,
    snapshot: auditSnapshot(data),
  });

  return { success: true, data };
}

export async function deleteHomepageSectionHandler(
  ctx: BffContext,
): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid section id" } };
  }

  const existing = await findHomepageSectionById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Homepage section not found" } };
  }

  await softDeleteHomepageSection(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "homepage_section.deleted",
    entityType: "shop_page",
    entityId: id,
    snapshot: auditSnapshot(existing),
  });
  return { success: true, data: { ok: true } };
}

export async function reorderHomepageSectionHandler(
  ctx: BffContext,
): Promise<ApiResponse<HomepageSectionDto[]>> {
  const auth = await requirePermission("shop_pages.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid section id" } };
  }

  const parsed = reorderSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
    };
  }

  const data = await swapHomepageSectionOrder(id, parsed.data.otherId);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Homepage section not found" } };
  }

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "homepage_section.reordered",
    entityType: "shop_page",
    entityId: id,
    snapshot: { otherId: parsed.data.otherId },
  });

  return { success: true, data };
}
