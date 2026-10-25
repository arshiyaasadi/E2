import { z } from "zod";
import { requirePermission, requireSession } from "@/lib/api/server/auth-guard";
import {
  createShippingMethod,
  getStoreSettings,
  listOrderStatusDefinitions,
  listPaymentGateways,
  listShippingMethods,
  mapOrderStatusDefinition,
  mapPaymentGateway,
  mapShippingMethod,
  mapStoreSettings,
  softDeleteShippingMethod,
  updatePaymentGateway,
  updateShippingMethod,
  updateStoreSettings,
} from "@/lib/db/repositories/project.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type {
  OrderStatusDefinitionDto,
  PaymentGatewayDto,
  ShippingMethodDto,
  StoreSettingsDto,
} from "@/types/domain";

const updateStoreSettingsSchema = z.object({
  taxRate: z.coerce.number().min(0).max(100),
  currency: z.string().length(3),
  cartTtlSeconds: z.coerce.number().int().positive(),
  reservationTtlSeconds: z.coerce.number().int().positive(),
});

const shippingMethodSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  baseCost: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

const updateShippingMethodSchema = shippingMethodSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "No fields to update" },
);

const updatePaymentGatewaySchema = z.object({
  isActive: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function getStoreSettingsHandler(): Promise<ApiResponse<StoreSettingsDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const row = await getStoreSettings();
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "Store settings not found" } };
  }

  return { success: true, data: mapStoreSettings(row) };
}

export async function updateStoreSettingsHandler(body: unknown): Promise<ApiResponse<StoreSettingsDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const parsed = updateStoreSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const existing = await getStoreSettings();
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Store settings not found" } };
  }

  const row = await updateStoreSettings(existing.id, parsed.data);
  return { success: true, data: mapStoreSettings(row) };
}

export async function listShippingMethodsHandler(): Promise<ApiResponse<ShippingMethodDto[]>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const rows = await listShippingMethods();
  return { success: true, data: rows.map(mapShippingMethod) };
}

export async function createShippingMethodHandler(body: unknown): Promise<ApiResponse<ShippingMethodDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const parsed = shippingMethodSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const rows = await createShippingMethod({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    baseCost: parsed.data.baseCost,
    isActive: parsed.data.isActive,
  });

  return { success: true, data: mapShippingMethod(rows[0]) };
}

export async function updateShippingMethodHandler(ctx: BffContext): Promise<ApiResponse<ShippingMethodDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shipping method id" } };
  }

  const parsed = updateShippingMethodSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const row = await updateShippingMethod(id, parsed.data);
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shipping method not found" } };
  }

  return { success: true, data: mapShippingMethod(row) };
}

export async function deleteShippingMethodHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid shipping method id" } };
  }

  const deleted = await softDeleteShippingMethod(id);
  if (!deleted) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shipping method not found" } };
  }

  return { success: true, data: { ok: true } };
}

export async function listPaymentGatewaysHandler(): Promise<ApiResponse<PaymentGatewayDto[]>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const rows = await listPaymentGateways();
  return { success: true, data: rows.map(mapPaymentGateway) };
}

export async function updatePaymentGatewayHandler(ctx: BffContext): Promise<ApiResponse<PaymentGatewayDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid gateway id" } };
  }

  const parsed = updatePaymentGatewaySchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const row = await updatePaymentGateway(id, parsed.data);
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "Payment gateway not found" } };
  }

  return { success: true, data: mapPaymentGateway(row) };
}

export async function listOrderStatusesHandler(): Promise<ApiResponse<OrderStatusDefinitionDto[]>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const rows = await listOrderStatusDefinitions();
  return { success: true, data: rows.map(mapOrderStatusDefinition) };
}
