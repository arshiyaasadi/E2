import { prisma } from "@/lib/db/prisma";

export async function listAllPermissionKeys(): Promise<string[]> {
  const permissions = await prisma.permission.findMany({
    where: { deletedAt: null },
    select: { key: true },
    orderBy: { key: "asc" },
  });
  return permissions.map((permission) => permission.key);
}

export async function getPermissionKeysForUser(userId: string): Promise<string[]> {
  const user = await prisma.adminUser.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: {
      roleId: true,
      role: {
        select: { name: true, deletedAt: true },
      },
    },
  });

  if (!user?.roleId || !user.role || user.role.deletedAt !== null) {
    return [];
  }

  if (user.role.name === "super_admin") {
    return listAllPermissionKeys();
  }

  const rows = await prisma.rolePermission.findMany({
    where: { roleId: user.roleId },
    select: {
      permission: {
        select: { key: true, deletedAt: true },
      },
    },
  });

  return rows
    .map((row) => row.permission)
    .filter((permission) => permission.deletedAt === null)
    .map((permission) => permission.key);
}

export async function listPermissions() {
  return prisma.permission.findMany({
    where: { deletedAt: null },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      description: true,
    },
  });
}

export async function getPermissionKeysForRole(roleId: string): Promise<string[]> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, deletedAt: null },
    select: { name: true },
  });

  if (role?.name === "super_admin") {
    return listAllPermissionKeys();
  }

  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: {
      permission: {
        select: { key: true, deletedAt: true },
      },
    },
  });

  return rows
    .map((row) => row.permission)
    .filter((permission) => permission.deletedAt === null)
    .map((permission) => permission.key);
}
