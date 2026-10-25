import { prisma } from "@/lib/db/prisma";

export async function getStoreSettings() {
  return prisma.storeSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });
}

export async function updateStoreSettings(
  id: string,
  data: {
    taxRate: number;
    currency: string;
    cartTtlSeconds: number;
    reservationTtlSeconds: number;
  },
) {
  return prisma.storeSettings.update({
    where: { id },
    data: {
      taxRate: data.taxRate,
      currency: data.currency,
      cartTtlSeconds: data.cartTtlSeconds,
      reservationTtlSeconds: data.reservationTtlSeconds,
    },
  });
}

export async function listShippingMethods() {
  return prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string | null;
      base_cost: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT id, name, description, base_cost::text, is_active, created_at, updated_at
    FROM shipping_methods
    WHERE deleted_at IS NULL
    ORDER BY name ASC
  `;
}

export async function createShippingMethod(data: {
  name: string;
  description: string | null;
  baseCost: number;
  isActive: boolean;
}) {
  return prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string | null;
      base_cost: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    INSERT INTO shipping_methods (name, description, base_cost, is_active)
    VALUES (${data.name}, ${data.description}, ${data.baseCost}, ${data.isActive})
    RETURNING id, name, description, base_cost::text, is_active, created_at, updated_at
  `;
}

export async function updateShippingMethod(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    baseCost?: number;
    isActive?: boolean;
  },
) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM shipping_methods WHERE id = ${id}::uuid AND deleted_at IS NULL
  `;
  if (!existing.length) return null;

  if (data.name !== undefined) {
    await prisma.$executeRaw`UPDATE shipping_methods SET name = ${data.name}, updated_at = now() WHERE id = ${id}::uuid`;
  }
  if (data.description !== undefined) {
    await prisma.$executeRaw`UPDATE shipping_methods SET description = ${data.description}, updated_at = now() WHERE id = ${id}::uuid`;
  }
  if (data.baseCost !== undefined) {
    await prisma.$executeRaw`UPDATE shipping_methods SET base_cost = ${data.baseCost}, updated_at = now() WHERE id = ${id}::uuid`;
  }
  if (data.isActive !== undefined) {
    await prisma.$executeRaw`UPDATE shipping_methods SET is_active = ${data.isActive}, updated_at = now() WHERE id = ${id}::uuid`;
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      description: string | null;
      base_cost: string;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT id, name, description, base_cost::text, is_active, created_at, updated_at
    FROM shipping_methods
    WHERE id = ${id}::uuid
  `;
  return rows[0] ?? null;
}

export async function softDeleteShippingMethod(id: string) {
  const result = await prisma.$executeRaw`
    UPDATE shipping_methods SET deleted_at = now(), updated_at = now()
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `;
  return result > 0;
}

export async function listPaymentGateways() {
  return prisma.$queryRaw<
    Array<{
      id: string;
      code: string;
      name: string;
      settlement_type: string;
      is_active: boolean;
      config: unknown;
      sort_order: number;
      is_enabled: boolean | null;
      created_at: Date;
      updated_at: Date;
    }>
  >`
    SELECT
      pg.id,
      pg.code,
      pg.name,
      pg.settlement_type,
      pg.is_active,
      pg.config,
      pg.sort_order,
      spg.is_enabled,
      pg.created_at,
      pg.updated_at
    FROM payment_gateways pg
    LEFT JOIN store_payment_gateways spg ON spg.gateway_id = pg.id
    WHERE pg.deleted_at IS NULL
    ORDER BY pg.sort_order ASC, pg.name ASC
  `;
}

export async function updatePaymentGateway(
  id: string,
  data: {
    isActive?: boolean;
    sortOrder?: number;
    config?: Record<string, unknown>;
    isEnabled?: boolean;
  },
) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM payment_gateways WHERE id = ${id}::uuid AND deleted_at IS NULL
  `;
  if (!existing.length) return null;

  if (data.isActive !== undefined) {
    await prisma.$executeRaw`UPDATE payment_gateways SET is_active = ${data.isActive}, updated_at = now() WHERE id = ${id}::uuid`;
  }
  if (data.sortOrder !== undefined) {
    await prisma.$executeRaw`UPDATE payment_gateways SET sort_order = ${data.sortOrder}, updated_at = now() WHERE id = ${id}::uuid`;
  }
  if (data.config !== undefined) {
    await prisma.$executeRaw`
      UPDATE payment_gateways SET config = ${JSON.stringify(data.config)}::jsonb, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.isEnabled !== undefined) {
    await prisma.$executeRaw`
      INSERT INTO store_payment_gateways (gateway_id, is_enabled)
      VALUES (${id}::uuid, ${data.isEnabled})
      ON CONFLICT (gateway_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled
    `;
  }

  const rows = await listPaymentGateways();
  return rows.find((row) => row.id === id) ?? null;
}

export async function listOrderStatusDefinitions() {
  return prisma.$queryRaw<
    Array<{
      code: string;
      label_fa: string;
      label_en: string;
      sort_order: number;
      is_terminal: boolean;
      allowed_next_statuses: string[];
    }>
  >`
    SELECT code::text, label_fa, label_en, sort_order, is_terminal, allowed_next_statuses::text[] AS allowed_next_statuses
    FROM order_status_definitions
    ORDER BY sort_order ASC
  `;
}

export function mapStoreSettings(row: NonNullable<Awaited<ReturnType<typeof getStoreSettings>>>) {
  return {
    id: row.id,
    taxRate: Number(row.taxRate),
    currency: row.currency,
    cartTtlSeconds: row.cartTtlSeconds,
    reservationTtlSeconds: row.reservationTtlSeconds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapShippingMethod(row: Awaited<ReturnType<typeof listShippingMethods>>[number]) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseCost: Number(row.base_cost),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapPaymentGateway(row: Awaited<ReturnType<typeof listPaymentGateways>>[number]) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    settlementType: row.settlement_type,
    isActive: row.is_active,
    isEnabled: row.is_enabled ?? false,
    config: row.config,
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapOrderStatusDefinition(
  row: Awaited<ReturnType<typeof listOrderStatusDefinitions>>[number],
) {
  return {
    code: row.code,
    labelFa: row.label_fa,
    labelEn: row.label_en,
    sortOrder: row.sort_order,
    isTerminal: row.is_terminal,
    allowedNextStatuses: row.allowed_next_statuses,
  };
}
