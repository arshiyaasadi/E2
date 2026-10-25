import type { OrderStatus } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { listOrderStatusDefinitions } from "@/lib/db/repositories/project.repository";
import type { OrderStatusCode } from "@/types/domain";

export type OrderListFilters = {
  q?: string;
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
  offset?: number;
};

export type UpdateOrderStatusInput = {
  status: OrderStatus;
  trackingNumber?: string | null;
  note?: string | null;
};

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) return null;
  return Number(value.toString());
}

function mapOrderSummary(row: {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  grandTotal: Decimal;
  customerId: string;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { id: string; email: string; fullName: string | null };
}) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    grandTotal: decimalToNumber(row.grandTotal) ?? 0,
    customerId: row.customerId,
    customerEmail: row.customer.email,
    customerName: row.customer.fullName,
    trackingNumber: row.trackingNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrderStatusDefinition(status: OrderStatus) {
  const definitions = await listOrderStatusDefinitions();
  return definitions.find((row) => row.code === status) ?? null;
}

export async function assertAllowedStatusTransition(from: OrderStatus, to: OrderStatus) {
  const definition = await getOrderStatusDefinition(from);
  if (!definition) {
    throw new Error("Current order status is not configured");
  }
  if (!definition.allowed_next_statuses.includes(to)) {
    throw new Error(`Transition from ${from} to ${to} is not allowed`);
  }
}

export async function listOrders(filters: OrderListFilters = {}) {
  const q = filters.q?.trim();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const where = {
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" as const } },
            { trackingNumber: { contains: q, mode: "insensitive" as const } },
            { customer: { email: { contains: q, mode: "insensitive" as const } } },
            { customer: { fullName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: rows.map(mapOrderSummary),
    total,
    limit,
    offset,
  };
}

type PaymentRow = {
  id: string;
  gateway_id: string;
  amount: unknown;
  currency: string;
  status: string;
  external_id: string | null;
  paid_at: Date | null;
  created_at: Date;
  media_id: string | null;
  media_url: string | null;
  reject_reason: string | null;
  reviewed_at: Date | null;
  gateway_code: string | null;
  gateway_name: string | null;
};

export async function findOrderById(id: string) {
  const row = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: {
        select: { id: true, email: true, fullName: true, phone: true },
      },
      coupon: { select: { id: true, code: true } },
      shippingMethod: { select: { id: true, name: true } },
      items: {
        where: { deletedAt: null },
        orderBy: { productTitle: "asc" },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!row) return null;

  const payments = await prisma.$queryRaw<PaymentRow[]>`
    SELECT
      p.id::text AS id,
      p.gateway_id::text AS gateway_id,
      p.amount,
      p.currency,
      p.status::text AS status,
      p.external_id,
      p.paid_at,
      p.created_at,
      p.media_id::text AS media_id,
      m.url AS media_url,
      p.reject_reason,
      p.reviewed_at,
      pg.code::text AS gateway_code,
      pg.name AS gateway_name
    FROM payments p
    LEFT JOIN media m ON m.id = p.media_id AND m.deleted_at IS NULL
    LEFT JOIN payment_gateways pg ON pg.id = p.gateway_id AND pg.deleted_at IS NULL
    WHERE p.order_id = ${row.id}::uuid
      AND p.deleted_at IS NULL
    ORDER BY p.created_at DESC
  `;

  const currentDefinition = await getOrderStatusDefinition(row.status);

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    subtotal: decimalToNumber(row.subtotal) ?? 0,
    discountTotal: decimalToNumber(row.discountTotal) ?? 0,
    taxTotal: decimalToNumber(row.taxTotal) ?? 0,
    shippingTotal: decimalToNumber(row.shippingTotal) ?? 0,
    grandTotal: decimalToNumber(row.grandTotal) ?? 0,
    couponCode: row.couponCode,
    couponId: row.couponId,
    shippingMethodId: row.shippingMethodId,
    shippingMethodName: row.shippingMethodName ?? row.shippingMethod?.name ?? null,
    shippingAddress: row.shippingAddress,
    trackingNumber: row.trackingNumber,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allowedNextStatuses: (currentDefinition?.allowed_next_statuses ?? []) as OrderStatusCode[],
    isTerminal: currentDefinition?.is_terminal ?? false,
    customer: {
      id: row.customer.id,
      email: row.customer.email,
      fullName: row.customer.fullName,
      phone: row.customer.phone,
    },
    items: row.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productTitle: item.productTitle,
      variantSku: item.variantSku,
      variantLabel: item.variantLabel,
      unitPrice: decimalToNumber(item.unitPrice) ?? 0,
      quantity: item.quantity,
      taxAmount: decimalToNumber(item.taxAmount) ?? 0,
      lineTotal: decimalToNumber(item.lineTotal) ?? 0,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      gatewayId: payment.gateway_id,
      amount: decimalToNumber(payment.amount as never) ?? 0,
      currency: payment.currency,
      status: payment.status,
      externalId: payment.external_id,
      paidAt: payment.paid_at?.toISOString() ?? null,
      createdAt: payment.created_at.toISOString(),
      mediaUrl: payment.media_url,
      rejectReason: payment.reject_reason,
      reviewedAt: payment.reviewed_at?.toISOString() ?? null,
      gatewayCode: payment.gateway_code,
      gatewayName: payment.gateway_name,
    })),
    statusHistory: row.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorType: entry.actorType,
      actorId: entry.actorId,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function approveOrderPayment(input: {
  orderId: string;
  paymentId: string;
  actorId: string;
}) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!order) return null;

  const payments = await prisma.$queryRaw<
    Array<{ id: string; status: string; media_id: string | null }>
  >`
    SELECT id::text AS id, status::text AS status, media_id::text AS media_id
    FROM payments
    WHERE id = ${input.paymentId}::uuid
      AND order_id = ${input.orderId}::uuid
      AND deleted_at IS NULL
    LIMIT 1
  `;
  const payment = payments[0];
  if (!payment) return null;
  if (payment.status !== "pending" || !payment.media_id) {
    throw new Error("Payment is not awaiting receipt review");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE payments
      SET status = 'paid'::payment_status,
          paid_at = now(),
          reviewed_at = now(),
          reviewed_by = ${input.actorId}::uuid,
          reject_reason = NULL,
          updated_at = now()
      WHERE id = ${payment.id}::uuid
    `;

    if (order.status === "pending") {
      await assertAllowedStatusTransition(order.status, "paid");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "paid" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "paid",
          actorType: "admin",
          actorId: input.actorId,
          note: "تأیید رسید کارت به کارت",
        },
      });
    }
  });

  return findOrderById(input.orderId);
}

export async function rejectOrderPayment(input: {
  orderId: string;
  paymentId: string;
  actorId: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Reject reason is required");
  }

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!order) return null;

  const payments = await prisma.$queryRaw<
    Array<{ id: string; status: string; media_id: string | null }>
  >`
    SELECT id::text AS id, status::text AS status, media_id::text AS media_id
    FROM payments
    WHERE id = ${input.paymentId}::uuid
      AND order_id = ${input.orderId}::uuid
      AND deleted_at IS NULL
    LIMIT 1
  `;
  const payment = payments[0];
  if (!payment) return null;
  if (payment.status !== "pending" || !payment.media_id) {
    throw new Error("Payment is not awaiting receipt review");
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE payments
      SET status = 'failed'::payment_status,
          reject_reason = ${reason},
          reviewed_at = now(),
          reviewed_by = ${input.actorId}::uuid,
          updated_at = now()
      WHERE id = ${payment.id}::uuid
    `;

    if (order.status !== "cancelled") {
      await assertAllowedStatusTransition(order.status, "cancelled");
      await tx.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "cancelled",
          actorType: "admin",
          actorId: input.actorId,
          note: reason,
        },
      });
    }
  });

  return findOrderById(input.orderId);
}

export async function updateOrderStatus(id: string, input: UpdateOrderStatusInput) {
  const existing = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!existing) return null;

  if (existing.status !== input.status) {
    await assertAllowedStatusTransition(existing.status, input.status);
  }

  const data: {
    status: OrderStatus;
    trackingNumber?: string | null;
    shippedAt?: Date | null;
  } = { status: input.status };

  if (input.trackingNumber !== undefined) {
    data.trackingNumber = input.trackingNumber;
  }

  if (input.status === "shipped") {
    data.shippedAt = new Date();
  }

  await prisma.order.update({
    where: { id },
    data,
  });

  return findOrderById(id);
}

export function orderAuditSnapshot(order: Awaited<ReturnType<typeof findOrderById>>) {
  if (!order) return null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    grandTotal: order.grandTotal,
    customerEmail: order.customer.email,
  };
}
