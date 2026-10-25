import { prisma } from "@/lib/db/prisma";
import type { AdminOverview } from "@/types/domain";

export async function getAdminOverview(): Promise<AdminOverview> {
  const [productsCount, ordersCount, customersCount] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null } }),
  ]);

  return { productsCount, ordersCount, customersCount };
}
