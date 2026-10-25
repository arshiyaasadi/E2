import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  approveOrderPayment,
  findOrderById,
  listOrders,
  orderAuditSnapshot,
  rejectOrderPayment,
  updateOrderStatus,
} from "@/lib/db/repositories/order.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { OrderDetailDto, OrderListResultDto } from "@/types/domain";

const orderStatusSchema = z.enum([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  trackingNumber: z.string().max(120).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

function parseListParams(searchParams: URLSearchParams) {
  const q = searchParams.get("q") ?? undefined;
  const statusRaw = searchParams.get("status");
  const customerId = searchParams.get("customerId") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");

  const status =
    statusRaw && orderStatusSchema.safeParse(statusRaw).success
      ? (statusRaw as OrderStatus)
      : undefined;

  return {
    q,
    status,
    customerId,
    limit: limitRaw ? Number(limitRaw) : undefined,
    offset: offsetRaw ? Number(offsetRaw) : undefined,
  };
}

export async function listOrdersHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<OrderListResultDto>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const data = await listOrders(parseListParams(searchParams));
  return { success: true, data };
}

export async function getOrderHandler(ctx: BffContext): Promise<ApiResponse<OrderDetailDto>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order id" } };
  }

  const data = await findOrderById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
  }

  return { success: true, data };
}

export async function updateOrderStatusHandler(
  ctx: BffContext,
): Promise<ApiResponse<OrderDetailDto>> {
  const auth = await requirePermission("orders.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order id" } };
  }

  const existing = await findOrderById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
  }

  const parsed = updateOrderStatusSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  if (parsed.data.status === "shipped" && !parsed.data.trackingNumber?.trim() && !existing.trackingNumber) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Tracking number is required when marking as shipped" },
    };
  }

  try {
    const data = await updateOrderStatus(id, {
      status: parsed.data.status,
      trackingNumber:
        parsed.data.trackingNumber !== undefined
          ? parsed.data.trackingNumber
          : parsed.data.status === "shipped"
            ? existing.trackingNumber
            : undefined,
      note: parsed.data.note,
    });

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "order.status_updated",
      entityType: "order",
      entityId: id,
      snapshot: {
        before: orderAuditSnapshot(existing),
        after: orderAuditSnapshot(data),
        note: parsed.data.note,
      },
    });

    return { success: true, data: data! };
  } catch (error) {
    if (error instanceof Error && error.message.includes("not allowed")) {
      return { success: false, error: { code: "CONFLICT", message: error.message } };
    }
    throw error;
  }
}

const rejectPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export async function approveOrderPaymentHandler(
  ctx: BffContext,
): Promise<ApiResponse<OrderDetailDto>> {
  const auth = await requirePermission("orders.manage");
  if (!auth.ok) return auth.response;

  const orderId = ctx.params.id;
  const paymentId = ctx.params.paymentId;
  if (!orderId || !uuidSchema.safeParse(orderId).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order id" } };
  }
  if (!paymentId || !uuidSchema.safeParse(paymentId).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payment id" } };
  }

  const existing = await findOrderById(orderId);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
  }

  try {
    const data = await approveOrderPayment({
      orderId,
      paymentId,
      actorId: auth.session.sub,
    });
    if (!data) {
      return { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } };
    }

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "order.payment_approved",
      entityType: "order",
      entityId: orderId,
      snapshot: {
        before: orderAuditSnapshot(existing),
        after: orderAuditSnapshot(data),
        paymentId,
      },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: { code: "CONFLICT", message: error.message } };
    }
    throw error;
  }
}

export async function rejectOrderPaymentHandler(
  ctx: BffContext,
): Promise<ApiResponse<OrderDetailDto>> {
  const auth = await requirePermission("orders.manage");
  if (!auth.ok) return auth.response;

  const orderId = ctx.params.id;
  const paymentId = ctx.params.paymentId;
  if (!orderId || !uuidSchema.safeParse(orderId).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid order id" } };
  }
  if (!paymentId || !uuidSchema.safeParse(paymentId).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid payment id" } };
  }

  const parsed = rejectPaymentSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Reject reason is required",
      },
    };
  }

  const existing = await findOrderById(orderId);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
  }

  try {
    const data = await rejectOrderPayment({
      orderId,
      paymentId,
      actorId: auth.session.sub,
      reason: parsed.data.reason,
    });
    if (!data) {
      return { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } };
    }

    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "order.payment_rejected",
      entityType: "order",
      entityId: orderId,
      snapshot: {
        before: orderAuditSnapshot(existing),
        after: orderAuditSnapshot(data),
        paymentId,
        reason: parsed.data.reason,
      },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: { code: "CONFLICT", message: error.message } };
    }
    throw error;
  }
}
