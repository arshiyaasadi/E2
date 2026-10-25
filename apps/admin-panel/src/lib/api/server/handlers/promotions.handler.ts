import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createPromotion,
  findPromotionById,
  listPromotions,
  promotionAuditSnapshot,
  softDeletePromotion,
  updatePromotion,
} from "@/lib/db/repositories/promotion.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { PromotionDto } from "@/types/domain";

const promotionTypeSchema = z.enum(["percentage", "fixed"]);
const targetTypeSchema = z.enum(["category", "product"]);

const targetSchema = z.object({
  targetType: targetTypeSchema,
  targetId: uuidSchema,
});

const createPromotionSchema = z.object({
  name: z.string().min(1).max(150),
  type: promotionTypeSchema,
  value: z.number().min(0),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  targets: z.array(targetSchema).optional(),
});

const updatePromotionSchema = createPromotionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export async function listPromotionsHandler(): Promise<ApiResponse<PromotionDto[]>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  return { success: true, data: await listPromotions() };
}

export async function getPromotionHandler(ctx: BffContext): Promise<ApiResponse<PromotionDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid promotion id" } };
  }

  const data = await findPromotionById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Promotion not found" } };
  }

  return { success: true, data };
}

export async function createPromotionHandler(body: unknown): Promise<ApiResponse<PromotionDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const parsed = createPromotionSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const data = await createPromotion({
    name: parsed.data.name,
    type: parsed.data.type,
    value: parsed.data.value,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    isActive: parsed.data.isActive,
    targets: parsed.data.targets,
  });

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "promotion.created",
    entityType: "promotion",
    entityId: data.id,
    snapshot: promotionAuditSnapshot(data),
  });

  return { success: true, data };
}

export async function updatePromotionHandler(ctx: BffContext): Promise<ApiResponse<PromotionDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid promotion id" } };
  }

  const existing = await findPromotionById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Promotion not found" } };
  }

  const parsed = updatePromotionSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const data = await updatePromotion(id, parsed.data);

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "promotion.updated",
    entityType: "promotion",
    entityId: data.id,
    snapshot: { before: promotionAuditSnapshot(existing), after: promotionAuditSnapshot(data) },
  });

  return { success: true, data };
}

export async function deletePromotionHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid promotion id" } };
  }

  const existing = await findPromotionById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Promotion not found" } };
  }

  await softDeletePromotion(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "promotion.deleted",
    entityType: "promotion",
    entityId: id,
    snapshot: promotionAuditSnapshot(existing),
  });

  return { success: true, data: { ok: true } };
}
