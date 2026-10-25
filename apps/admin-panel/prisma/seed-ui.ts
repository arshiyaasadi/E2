/**
 * Seeds the SQLite UI lab database with a super_admin and core permissions.
 * Run via: yarn workspace ecommerce-admin db:seed:ui
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSION_KEYS = [
  "orders.view",
  "orders.manage",
  "products.view",
  "products.manage",
  "shop_pages.view",
  "shop_pages.manage",
  "blog.view",
  "blog.manage",
  "coupons.manage",
  "settings.manage",
  "users.view",
  "users.manage",
] as const;

const UI_ADMIN_EMAIL = process.env.UI_ADMIN_EMAIL ?? "admin@local.dev";
const UI_ADMIN_PASSWORD = process.env.UI_ADMIN_PASSWORD ?? "admin123";

async function main() {
  for (const key of PERMISSION_KEYS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: key },
      update: { deletedAt: null },
    });
  }

  const role = await prisma.role.upsert({
    where: { name: "super_admin" },
    create: {
      name: "super_admin",
      description: "Full access (UI lab)",
    },
    update: { deletedAt: null, description: "Full access (UI lab)" },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...PERMISSION_KEYS] }, deletedAt: null },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: role.id, permissionId: permission.id },
      update: {},
    });
  }

  const passwordHash = await bcrypt.hash(UI_ADMIN_PASSWORD, 12);
  await prisma.adminUser.upsert({
    where: { email: UI_ADMIN_EMAIL },
    create: {
      email: UI_ADMIN_EMAIL,
      fullName: "UI Lab Admin",
      passwordHash,
      roleId: role.id,
      isActive: true,
    },
    update: {
      passwordHash,
      roleId: role.id,
      isActive: true,
      deletedAt: null,
      fullName: "UI Lab Admin",
    },
  });

  const settings = await prisma.storeSettings.findFirst();
  if (!settings) {
    await prisma.storeSettings.create({
      data: { taxRate: 0, currency: "IRR" },
    });
  }

  console.log(`[seed-ui] Ready. Login: ${UI_ADMIN_EMAIL} / ${UI_ADMIN_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("[seed-ui] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
