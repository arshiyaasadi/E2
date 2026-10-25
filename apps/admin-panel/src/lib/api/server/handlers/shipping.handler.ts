import { z } from "zod";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  getShippingProviderById,
  invokeShippingProviderAction,
  listShippingProviders,
  mapShippingProvider,
  updateShippingProvider,
} from "@/lib/db/repositories/shipping.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { ShippingProviderDto } from "@/types/domain";
import type { ShippingAction } from "@/lib/shipping/types";

const updateShippingProviderSchema = z.object({
  isActive: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const shippingActions = [
  "obtainToken",
  "refreshToken",
  "tokenWithPhone",
  "listStates",
  "listCities",
  "listCitiesWithState",
  "listBranchCities",
  "listBusinessAddresses",
  "createBusinessAddress",
  "getAddress",
  "listAddressBook",
  "addAddressBook",
  "getCurrentCustomer",
  "getCredit",
  "getWallet",
  "rechargeWallet",
  "getRemain",
  "listMyCustomers",
  "getMyCustomer",
  "listMyProducts",
  "listMySubstations",
  "createMySubstation",
  "disableMySubstation",
  "enableMySubstation",
  "createOrder",
  "createOrderWithPreDefinedOrigin",
  "createOrderWithPreDefinedAddresses",
  "createOrderWithCoordinates",
  "createOrderWithDiscount",
  "createPluginOrder",
  "createMyTipaxOrder",
  "createPreOrder",
  "createQueueOrder",
  "createBulkQueueOrder",
  "createGroupOrder",
  "createOrderForAnotherCustomer",
  "cancelOrder",
  "cancelOrderByCode",
  "getOrderAmount",
  "getSumOrderAmounts",
  "price",
  "priceWithAddressId",
  "priceWithOriginAddressId",
  "priceForAllServices",
  "priceWithAddressIdForAllServices",
  "priceWithOriginAddressIdForAllServices",
  "getServicesBetweenCities",
  "listPackContentRates",
  "listPackingPrices",
  "listParcelBooks",
  "createParcelBook",
  "searchParcelTypes",
  "getParcelType",
  "searchPaymentTypes",
  "getPaymentType",
  "listParcelStatuses",
  "listParcelStatusEvents",
  "getParcelsByOrderId",
  "cancelParcel",
  "getParcelPaymentType",
  "getParcelAmount",
  "getParcelAmountByContract",
  "getParcelPriceDetail",
  "getParcelPriceDetailByContract",
  "sumParcelAmounts",
  "searchParcels",
  "trackBrief",
  "trackByContract",
  "trackByOrderId",
  "trackByTrackingCodes",
  "trackByTraceCode",
  "trackBySecondaryTraceCode",
  "listFinancialDocuments",
  "listFinancialDocumentsByYear",
  "getFinancialDocument",
  "listTickets",
  "createTicket",
  "answerTicket",
  "getTicket",
  "getTicketsByOrderId",
  "listTicketDepartments",
  "listWebhooks",
  "createWebhook",
  "updateWebhook",
  "softDeleteWebhook",
  "listWebhookHistory",
  "recentWebhookHistory",
  "searchLockerKiosks",
  "searchLockerBunches",
  "getNextDayTimeTable",
] as const;

const invokeSchema = z.object({
  action: z.enum(shippingActions),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function listShippingProvidersHandler(): Promise<ApiResponse<ShippingProviderDto[]>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const rows = await listShippingProviders();
  return { success: true, data: rows.map(mapShippingProvider) };
}

export async function updateShippingProviderHandler(
  ctx: BffContext,
): Promise<ApiResponse<ShippingProviderDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider id" } };
  }

  const parsed = updateShippingProviderSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
    };
  }

  const row = await updateShippingProvider(id, parsed.data);
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shipping provider not found" } };
  }

  return { success: true, data: mapShippingProvider(row) };
}

export async function invokeShippingProviderHandler(
  ctx: BffContext,
): Promise<ApiResponse<unknown>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider id" } };
  }

  const parsed = invokeSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
    };
  }

  const existing = await getShippingProviderById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Shipping provider not found" } };
  }

  const result = await invokeShippingProviderAction(
    id,
    parsed.data.action as ShippingAction,
    parsed.data.payload ?? {},
  );

  if (!result.success) {
    return {
      success: false,
      error: {
        code: "SHIPPING_PROVIDER_ERROR",
        message: result.errorMessage ?? "Shipping provider action failed",
      },
    };
  }

  // After token obtain, return refreshed provider snapshot for UI token status
  if (parsed.data.action === "obtainToken" || parsed.data.action === "refreshToken") {
    const row = await getShippingProviderById(id);
    return {
      success: true,
      data: {
        result: result.data,
        provider: row ? mapShippingProvider(row) : null,
      },
    };
  }

  return { success: true, data: result.data };
}
