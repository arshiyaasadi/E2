import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requirePermission } from "@/lib/api/server/auth-guard";
import { createAuditLog } from "@/lib/db/repositories/audit.repository";
import {
  createAdminUser,
  findAdminUserById,
  findAdminUserRecord,
  listAdminUsers,
  softDeleteAdminUser,
  updateAdminUser,
} from "@/lib/db/repositories/admin-user.repository";
import { countActiveSuperAdmins } from "@/lib/db/repositories/role.repository";
import { optionalUuidSchema, uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { AdminUserDto } from "@/types/domain";

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().max(120).nullable().optional(),
  roleId: uuidSchema,
  isActive: z.boolean().default(true),
});

const updateUserSchema = z
  .object({
    email: z.string().email().max(255).optional(),
    password: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(8).max(128).optional(),
    ),
    fullName: z.string().max(120).nullable().optional(),
    roleId: optionalUuidSchema,
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

async function ensureSuperAdminSafety(params: {
  targetUserId: string;
  actorUserId: string;
  nextRoleId?: string;
  nextIsActive?: boolean;
  isDelete?: boolean;
}) {
  const target = await findAdminUserRecord(params.targetUserId);
  if (!target) {
    return { ok: false as const, message: "User not found" };
  }

  const isTargetSuperAdmin = target.role?.name === "super_admin";

  if (params.isDelete && params.targetUserId === params.actorUserId) {
    return { ok: false as const, message: "You cannot delete your own account" };
  }

  if (params.nextIsActive === false && params.targetUserId === params.actorUserId) {
    return { ok: false as const, message: "You cannot deactivate your own account" };
  }

  if (isTargetSuperAdmin) {
    const willRemainSuperAdmin =
      !params.isDelete &&
      params.nextIsActive !== false &&
      (!params.nextRoleId || params.nextRoleId === target.roleId);

    if (!willRemainSuperAdmin) {
      const others = await countActiveSuperAdmins(params.targetUserId);
      if (others === 0) {
        return {
          ok: false as const,
          message: "At least one active super_admin user is required",
        };
      }
    }
  }

  if (params.nextRoleId && params.nextRoleId !== target.roleId) {
    if (isTargetSuperAdmin) {
      const others = await countActiveSuperAdmins(params.targetUserId);
      if (others === 0) {
        return {
          ok: false as const,
          message: "Cannot change role of the last super_admin",
        };
      }
    }
  }

  return { ok: true as const };
}

export async function listAdminUsersHandler(): Promise<ApiResponse<AdminUserDto[]>> {
  const auth = await requirePermission("users.view");
  if (!auth.ok) return auth.response;

  const data = await listAdminUsers();
  return { success: true, data };
}

export async function getAdminUserHandler(ctx: BffContext): Promise<ApiResponse<AdminUserDto>> {
  const auth = await requirePermission("users.view");
  if (!auth.ok) return auth.response;

  const userId = ctx.params.id;
  if (!userId) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "User id is required" } };
  }

  const data = await findAdminUserById(userId);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  }

  return { success: true, data };
}

export async function createAdminUserHandler(body: unknown): Promise<ApiResponse<AdminUserDto>> {
  const auth = await requirePermission("users.manage");
  if (!auth.ok) return auth.response;

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  try {
    const data = await createAdminUser({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName: parsed.data.fullName ?? null,
      roleId: parsed.data.roleId,
      isActive: parsed.data.isActive,
    });

    await createAuditLog({
      actorId: auth.session.sub,
      action: "admin_user.created",
      entityType: "admin_user",
      entityId: data.id,
      snapshot: { email: data.email, roleName: data.roleName, isActive: data.isActive },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Email already exists" } };
    }
    throw error;
  }
}

export async function updateAdminUserHandler(ctx: BffContext): Promise<ApiResponse<AdminUserDto>> {
  const auth = await requirePermission("users.manage");
  if (!auth.ok) return auth.response;

  const userId = ctx.params.id;
  if (!userId) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "User id is required" } };
  }

  const parsed = updateUserSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const existing = await findAdminUserById(userId);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  }

  const safety = await ensureSuperAdminSafety({
    targetUserId: userId,
    actorUserId: auth.session.sub,
    nextRoleId: parsed.data.roleId,
    nextIsActive: parsed.data.isActive,
  });
  if (!safety.ok) {
    return { success: false, error: { code: "BUSINESS_RULE", message: safety.message } };
  }

  try {
    const data = await updateAdminUser(userId, parsed.data);

    await createAuditLog({
      actorId: auth.session.sub,
      action: "admin_user.updated",
      entityType: "admin_user",
      entityId: userId,
      snapshot: { before: existing, after: data, changes: parsed.data },
    });

    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Email already exists" } };
    }
    throw error;
  }
}

export async function deleteAdminUserHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("users.manage");
  if (!auth.ok) return auth.response;

  const userId = ctx.params.id;
  if (!userId) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "User id is required" } };
  }

  const existing = await findAdminUserById(userId);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "User not found" } };
  }

  const safety = await ensureSuperAdminSafety({
    targetUserId: userId,
    actorUserId: auth.session.sub,
    isDelete: true,
  });
  if (!safety.ok) {
    return { success: false, error: { code: "BUSINESS_RULE", message: safety.message } };
  }

  await softDeleteAdminUser(userId);

  await createAuditLog({
    actorId: auth.session.sub,
    action: "admin_user.deleted",
    entityType: "admin_user",
    entityId: userId,
    snapshot: { email: existing.email, roleName: existing.roleName },
  });

  return { success: true, data: { ok: true } };
}
