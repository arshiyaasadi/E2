import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const REVENUE_STATUSES: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];

function decimalToNumber(value: { toString(): string } | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 6 ? 0 : day + 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getReportsDashboard() {
  const today = startOfToday();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const revenueWhere = {
    deletedAt: null,
    status: { in: REVENUE_STATUSES },
  } as const;

  const [
    totalRevenueAgg,
    monthRevenueAgg,
    ordersToday,
    ordersThisWeek,
    ordersThisMonth,
    pendingOrders,
    activeProducts,
    activeCustomers,
    newCustomersThisMonth,
    activeCoupons,
    couponRedemptions,
    ordersByStatus,
    recentOrders,
    topProductsRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: revenueWhere,
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { ...revenueWhere, createdAt: { gte: monthStart } },
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.order.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
    prisma.order.count({ where: { deletedAt: null, createdAt: { gte: weekStart } } }),
    prisma.order.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.product.count({ where: { deletedAt: null, status: "active" } }),
    prisma.customer.count({ where: { deletedAt: null, isActive: true } }),
    prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: monthStart } } }),
    prisma.coupon.count({ where: { deletedAt: null, isActive: true } }),
    prisma.couponUsage.count(),
    prisma.order.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
      _sum: { grandTotal: true },
    }),
    prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        customer: { select: { email: true, fullName: true } },
      },
    }),
    prisma.$queryRaw<
      Array<{
        product_title: string;
        variant_sku: string;
        quantity_sold: number;
        revenue: string;
      }>
    >`
      SELECT
        oi.product_title,
        oi.variant_sku,
        SUM(oi.quantity)::int AS quantity_sold,
        SUM(oi.line_total)::text AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.deleted_at IS NULL
        AND o.deleted_at IS NULL
        AND o.status::text IN ('paid', 'processing', 'shipped', 'delivered')
      GROUP BY oi.product_title, oi.variant_sku
      ORDER BY quantity_sold DESC
      LIMIT 8
    `,
  ]);

  const paidOrderCount = totalRevenueAgg._count;
  const totalRevenue = decimalToNumber(totalRevenueAgg._sum.grandTotal);
  const revenueThisMonth = decimalToNumber(monthRevenueAgg._sum.grandTotal);

  return {
    summary: {
      totalRevenue,
      revenueThisMonth,
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      averageOrderValue: paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0,
      pendingOrders,
      activeProducts,
      activeCustomers,
      newCustomersThisMonth,
      paidOrdersCount: paidOrderCount,
    },
    ordersByStatus: ordersByStatus
      .map((row) => ({
        status: row.status,
        count: row._count,
        revenue: decimalToNumber(row._sum.grandTotal),
      }))
      .sort((a, b) => b.count - a.count),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      grandTotal: decimalToNumber(order.grandTotal),
      customerEmail: order.customer.email,
      customerName: order.customer.fullName,
      createdAt: order.createdAt.toISOString(),
    })),
    topProducts: topProductsRaw.map((row) => ({
      productTitle: row.product_title,
      variantSku: row.variant_sku,
      quantitySold: Number(row.quantity_sold),
      revenue: Number(row.revenue),
    })),
    couponStats: {
      activeCoupons,
      totalRedemptions: couponRedemptions,
    },
  };
}
