import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  couponAuditSnapshot,
  couponCodeExists,
  createCoupon,
  findCouponById,
  listCoupons,
  softDeleteCoupon,
  updateCoupon,
} from "@/lib/db/repositories/coupon.repository";
import { optionalUuidSchema, uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { CouponDto } from "@/types/domain";

const benefitTypeSchema = z.enum(["percentage", "fixed", "free_shipping"]);
const scopeTypeSchema = z.enum(["order", "category", "product", "first_order"]);

const scopeSchema = z.object({
  scopeType: scopeTypeSchema,
  scopeId: optionalUuidSchema.nullable().optional(),
});

const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  benefitType: benefitTypeSchema,
  value: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  maxUsesPerCustomer: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
  isWelcome: z.boolean().optional(),
  scopes: z.array(scopeSchema).optional(),
});

const updateCouponSchema = createCouponSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export async function listCouponsHandler(): Promise<ApiResponse<CouponDto[]>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  return { success: true, data: await listCoupons() };
}

export async function getCouponHandler(ctx: BffContext): Promise<ApiResponse<CouponDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid coupon id" } };
  }

  const data = await findCouponById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Coupon not found" } };
  }

  return { success: true, data };
}

export async function createCouponHandler(body: unknown): Promise<ApiResponse<CouponDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const code = parsed.data.code.trim().toUpperCase();
  if (await couponCodeExists(code)) {
    return { success: false, error: { code: "CONFLICT", message: "Coupon code already exists" } };
  }

  try {
    const data = await createCoupon({
      code,
      benefitType: parsed.data.benefitType,
      value: parsed.data.value,
      minOrderAmount: parsed.data.minOrderAmount,
      maxDiscount: parsed.data.maxDiscount,
      maxUses: parsed.data.maxUses,
      maxUsesPerCustomer: parsed.data.maxUsesPerCustomer,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      isActive: parsed.data.isActive,
      isWelcome: parsed.data.isWelcome,
      scopes: parsed.data.scopes,
    });

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "coupon.created",
      entityType: "coupon",
      entityId: data.id,
      snapshot: couponAuditSnapshot(data),
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Coupon code already exists" } };
    }
    throw error;
  }
}

export async function updateCouponHandler(ctx: BffContext): Promise<ApiResponse<CouponDto>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid coupon id" } };
  }

  const existing = await findCouponById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Coupon not found" } };
  }

  const parsed = updateCouponSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const code = parsed.data.code?.trim().toUpperCase();
  if (code && (await couponCodeExists(code, id))) {
    return { success: false, error: { code: "CONFLICT", message: "Coupon code already exists" } };
  }

  try {
    const data = await updateCoupon(id, {
      ...(code !== undefined ? { code } : {}),
      benefitType: parsed.data.benefitType,
      value: parsed.data.value,
      minOrderAmount: parsed.data.minOrderAmount,
      maxDiscount: parsed.data.maxDiscount,
      maxUses: parsed.data.maxUses,
      maxUsesPerCustomer: parsed.data.maxUsesPerCustomer,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      isActive: parsed.data.isActive,
      isWelcome: parsed.data.isWelcome,
      scopes: parsed.data.scopes,
    });

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "coupon.updated",
      entityType: "coupon",
      entityId: data.id,
      snapshot: { before: couponAuditSnapshot(existing), after: couponAuditSnapshot(data) },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Coupon code already exists" } };
    }
    throw error;
  }
}

export async function deleteCouponHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("coupons.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid coupon id" } };
  }

  const existing = await findCouponById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Coupon not found" } };
  }

  await softDeleteCoupon(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "coupon.deleted",
    entityType: "coupon",
    entityId: id,
    snapshot: couponAuditSnapshot(existing),
  });

  return { success: true, data: { ok: true } };
}
