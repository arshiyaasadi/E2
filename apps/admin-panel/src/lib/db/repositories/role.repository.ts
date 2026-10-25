import { prisma } from "@/lib/db/prisma";

export async function listRoles() {
  return prisma.role.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          adminUsers: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });
}

export async function findRoleById(roleId: string) {
  return prisma.role.findFirst({
    where: { id: roleId, deletedAt: null },
    include: {
      permissions: {
        include: { permission: true },
      },
      _count: {
        select: {
          adminUsers: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });
}

export async function countActiveSuperAdmins(excludeUserId?: string) {
  return prisma.adminUser.count({
    where: {
      deletedAt: null,
      isActive: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
      role: { name: "super_admin", deletedAt: null },
    },
  });
}

export async function replaceRolePermissions(roleId: string, permissionIds: string[]) {
  return prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });

    if (permissionIds.length === 0) return;

    await tx.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  });
}

export async function updateRoleDescription(roleId: string, description: string | null) {
  return prisma.role.update({
    where: { id: roleId },
    data: { description, updatedAt: new Date() },
  });
}
