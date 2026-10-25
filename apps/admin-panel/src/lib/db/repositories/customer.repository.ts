import type { Decimal } from "@prisma/client/runtime/library";
import { customerEmailFromPhone } from "@/config/customer-auth";
import { prisma } from "@/lib/db/prisma";

export type CustomerListFilters = {
  q?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  offset?: number;
};

export type CustomerGrowthRange = "week" | "month";

export type CustomerWriteInput = {
  fullName?: string | null;
  phone?: string | null;
  email?: string;
  isActive?: boolean;
};

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) return null;
  return Number(value.toString());
}

function resolveLastActivityAt(row: {
  updatedAt: Date;
  orders: Array<{ createdAt: Date }>;
  carts: Array<{ updatedAt: Date }>;
}) {
  const timestamps = [row.updatedAt.getTime()];
  if (row.orders[0]) timestamps.push(row.orders[0].createdAt.getTime());
  if (row.carts[0]) timestamps.push(row.carts[0].updatedAt.getTime());
  return new Date(Math.max(...timestamps)).toISOString();
}

function mapCustomerSummary(row: {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  orders: Array<{ createdAt: Date }>;
  carts: Array<{ updatedAt: Date }>;
  _count?: { orders: number };
}) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    ordersCount: row._count?.orders ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastActivityAt: resolveLastActivityAt(row),
  };
}

function buildCustomerListWhere(filters: CustomerListFilters) {
  const q = filters.q?.trim();
  const fullName = filters.fullName?.trim();
  const email = filters.email?.trim();
  const phone = filters.phone?.trim();
  const createdFrom = filters.createdFrom ? new Date(filters.createdFrom) : undefined;
  const createdTo = filters.createdTo ? new Date(filters.createdTo) : undefined;

  return {
    deletedAt: null,
    ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    ...(fullName ? { fullName: { contains: fullName, mode: "insensitive" as const } } : {}),
    ...(email ? { email: { contains: email, mode: "insensitive" as const } } : {}),
    ...(phone ? { phone: { contains: phone, mode: "insensitive" as const } } : {}),
    ...(createdFrom ? { createdAt: { gte: createdFrom } } : {}),
    ...(createdTo ? { createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), lte: createdTo } } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { fullName: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function findCustomerByPhone(phone: string) {
  const row = await prisma.customer.findFirst({
    where: { phone, deletedAt: null },
  });

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    hasPassword: Boolean(row.passwordHash),
  };
}

export async function findCustomerAuthByPhone(phone: string) {
  const row = await prisma.customer.findFirst({
    where: { phone, deletedAt: null },
  });

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    passwordHash: row.passwordHash,
  };
}

export async function createCustomerFromPhone(phone: string, fullName?: string | null) {
  const email = customerEmailFromPhone(phone);

  const existing = await prisma.customer.findFirst({
    where: { email, deletedAt: null },
  });

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      fullName: existing.fullName,
      phone: existing.phone,
      isActive: existing.isActive,
      hasPassword: Boolean(existing.passwordHash),
    };
  }

  const row = await prisma.customer.create({
    data: {
      email,
      phone,
      fullName: fullName?.trim() || null,
      isActive: true,
    },
  });

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    hasPassword: false,
  };
}

export async function updateCustomerFullName(id: string, fullName: string) {
  const row = await prisma.customer.update({
    where: { id },
    data: { fullName: fullName.trim() },
  });

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    hasPassword: Boolean(row.passwordHash),
  };
}

export async function updateCustomerPassword(id: string, passwordHash: string) {
  await prisma.customer.update({
    where: { id },
    data: { passwordHash },
  });
}

export async function listCustomers(filters: CustomerListFilters = {}) {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const where = buildCustomerListWhere(filters);

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { orders: { where: { deletedAt: null } } } },
        orders: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        carts: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: rows.map(mapCustomerSummary),
    total,
    limit,
    offset,
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildGrowthSeries(days: number, rows: Array<{ day: Date; count: bigint | number }>) {
  const countByDay = new Map(rows.map((row) => [formatDayKey(row.day), Number(row.count)]));
  const today = startOfDay(new Date());
  const series: Array<{ date: string; count: number }> = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - offset);
    const key = formatDayKey(day);
    series.push({ date: key, count: countByDay.get(key) ?? 0 });
  }

  return series;
}

export async function getCustomerStats(range: CustomerGrowthRange = "week") {
  const days = range === "month" ? 30 : 7;
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (days - 1));

  const [total, signupRows] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(created_at) AS day, COUNT(*)::bigint AS count
      FROM customers
      WHERE deleted_at IS NULL
        AND created_at >= ${from}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `,
  ]);

  return {
    total,
    range,
    days,
    series: buildGrowthSeries(days, signupRows),
    periodTotal: signupRows.reduce((sum, row) => sum + Number(row.count), 0),
  };
}

export async function findCustomerById(id: string) {
  const row = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      addresses: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
      },
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
        },
      },
      wishlists: {
        where: { deletedAt: null },
        include: {
          product: {
            select: { id: true, title: true, slug: true, basePrice: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      carts: {
        where: { deletedAt: null, expiresAt: { gt: new Date() } },
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: {
                include: {
                  product: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      couponUsages: {
        orderBy: { usedAt: "desc" },
        take: 10,
        include: {
          coupon: { select: { id: true, code: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      },
      _count: {
        select: {
          orders: { where: { deletedAt: null } },
          wishlists: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!row) return null;

  const activeCart = row.carts[0] ?? null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    ordersCount: row._count.orders,
    wishlistCount: row._count.wishlists,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    addresses: row.addresses.map((address) => ({
      id: address.id,
      type: address.type,
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      provinceId: address.provinceId,
      cityId: address.cityId !== null ? Number(address.cityId) : null,
      addressLine: address.addressLine,
      buildingNumber: address.buildingNumber,
      unit: address.unit,
      floor: address.floor,
      postalCode: address.postalCode,
      latitude: address.latitude !== null ? Number(address.latitude.toString()) : null,
      longitude: address.longitude !== null ? Number(address.longitude.toString()) : null,
      tipaxCityId: address.tipaxCityId,
      createdAt: address.createdAt.toISOString(),
    })),
    orders: row.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      grandTotal: decimalToNumber(order.grandTotal) ?? 0,
      createdAt: order.createdAt.toISOString(),
    })),
    wishlist: row.wishlists.map((entry) => ({
      productId: entry.productId,
      title: entry.product.title,
      slug: entry.product.slug,
      basePrice: decimalToNumber(entry.product.basePrice),
      status: entry.product.status,
      addedAt: entry.createdAt.toISOString(),
    })),
    cart: activeCart
      ? {
          id: activeCart.id,
          expiresAt: activeCart.expiresAt.toISOString(),
          items: activeCart.items.map((item) => ({
            id: item.id,
            variantId: item.variantId,
            productTitle: item.variant.product.title,
            variantSku: item.variant.sku,
            quantity: item.quantity,
          })),
        }
      : null,
    couponUsages: row.couponUsages.map((usage) => ({
      id: usage.id,
      couponCode: usage.coupon.code,
      orderId: usage.order.id,
      orderNumber: usage.order.orderNumber,
      usedAt: usage.usedAt.toISOString(),
    })),
  };
}

export async function updateCustomer(id: string, data: CustomerWriteInput) {
  const row = await prisma.customer.update({
    where: { id },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    include: {
      _count: { select: { orders: { where: { deletedAt: null } } } },
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      carts: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
    },
  });
  return mapCustomerSummary(row);
}

export async function softDeleteCustomer(id: string) {
  await prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export function customerAuditSnapshot(
  customer: Awaited<ReturnType<typeof findCustomerById>>,
) {
  if (!customer) return null;
  return {
    email: customer.email,
    fullName: customer.fullName,
    isActive: customer.isActive,
    ordersCount: customer.ordersCount,
  };
}
