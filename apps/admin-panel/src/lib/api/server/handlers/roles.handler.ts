import { z } from "zod";
import { requirePermission, requireSession } from "@/lib/api/server/auth-guard";
import { createAuditLog } from "@/lib/db/repositories/audit.repository";
import { listPermissions } from "@/lib/db/repositories/permission.repository";
import {
  findRoleById,
  listRoles,
  replaceRolePermissions,
  updateRoleDescription,
} from "@/lib/db/repositories/role.repository";
import { uuidArraySchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { PermissionDto, RoleDto } from "@/types/domain";

function mapRole(role: Awaited<ReturnType<typeof listRoles>>[number]): RoleDto {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    userCount: role._count.adminUsers,
    permissionKeys: role.permissions
      .filter((entry) => entry.permission.deletedAt === null)
      .map((entry) => entry.permission.key),
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

export async function listRolesHandler(): Promise<ApiResponse<RoleDto[]>> {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const roles = await listRoles();
  return { success: true, data: roles.map(mapRole) };
}

export async function listPermissionsHandler(): Promise<ApiResponse<PermissionDto[]>> {
  const auth = await requirePermission("users.view");
  if (!auth.ok) return auth.response;

  const permissions = await listPermissions();
  return {
    success: true,
    data: permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
    })),
  };
}

const updateRoleSchema = z.object({
  description: z.string().max(500).nullable().optional(),
  permissionIds: uuidArraySchema.optional(),
});

export async function updateRoleHandler(ctx: BffContext): Promise<ApiResponse<RoleDto>> {
  const auth = await requirePermission("users.manage");
  if (!auth.ok) return auth.response;

  const roleId = ctx.params.id;
  if (!roleId) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Role id is required" } };
  }

  const parsed = updateRoleSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const role = await findRoleById(roleId);
  if (!role) {
    return { success: false, error: { code: "NOT_FOUND", message: "Role not found" } };
  }

  const beforeSnapshot = {
    name: role.name,
    description: role.description,
    permissionKeys: role.permissions
      .filter((entry) => entry.permission.deletedAt === null)
      .map((entry) => entry.permission.key),
  };

  if (role.name === "super_admin" && parsed.data.permissionIds) {
    const allPermissions = await listPermissions();
    const allIds = allPermissions.map((permission) => permission.id).sort();
    const nextIds = [...parsed.data.permissionIds].sort();
    if (allIds.length !== nextIds.length || allIds.some((id, index) => id !== nextIds[index])) {
      return {
        success: false,
        error: {
          code: "BUSINESS_RULE",
          message: "super_admin must always have all permissions",
        },
      };
    }
  }

  if (parsed.data.description !== undefined) {
    await updateRoleDescription(roleId, parsed.data.description ?? null);
  }

  if (parsed.data.permissionIds) {
    await replaceRolePermissions(roleId, parsed.data.permissionIds);
  }

  const updated = await findRoleById(roleId);
  if (!updated) {
    return { success: false, error: { code: "NOT_FOUND", message: "Role not found" } };
  }

  const afterData = {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    userCount: updated._count.adminUsers,
    permissionKeys: updated.permissions
      .filter((entry) => entry.permission.deletedAt === null)
      .map((entry) => entry.permission.key),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  await createAuditLog({
    actorId: auth.session.sub,
    action: "role.updated",
    entityType: "role",
    entityId: roleId,
    snapshot: { before: beforeSnapshot, after: afterData, changes: parsed.data },
  });

  return {
    success: true,
    data: afterData,
  };
}

export async function getRoleHandler(ctx: BffContext): Promise<ApiResponse<RoleDto>> {
  const auth = await requirePermission("users.view");
  if (!auth.ok) return auth.response;

  const roleId = ctx.params.id;
  if (!roleId) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Role id is required" } };
  }

  const role = await findRoleById(roleId);
  if (!role) {
    return { success: false, error: { code: "NOT_FOUND", message: "Role not found" } };
  }

  return {
    success: true,
    data: {
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.adminUsers,
      permissionKeys: role.permissions
        .filter((entry) => entry.permission.deletedAt === null)
        .map((entry) => entry.permission.key),
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    },
  };
}
