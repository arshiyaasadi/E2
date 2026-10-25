import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  customerEmailFromPhone,
  isSyntheticCustomerEmail,
} from "@/config/customer-auth";
import {
  customerAuditSnapshot,
  findCustomerById,
  getCustomerStats,
  listCustomers,
  softDeleteCustomer,
  updateCustomer,
} from "@/lib/db/repositories/customer.repository";
import { listCustomerLoginLogs } from "@/lib/db/repositories/customer-login-log.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type {
  CustomerDetailDto,
  CustomerListResultDto,
  CustomerLoginLogDto,
  CustomerStatsDto,
} from "@/types/domain";
import { prisma } from "@/lib/db/prisma";

const updateCustomerSchema = z
  .object({
    fullName: z.string().max(120).nullable().optional(),
    phone: z.string().max(20).nullable().optional(),
    email: z
      .union([z.string().email().max(190), z.literal(""), z.null()])
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

function parseListParams(searchParams: URLSearchParams) {
  const q = searchParams.get("q") ?? undefined;
  const fullName = searchParams.get("fullName") ?? undefined;
  const email = searchParams.get("email") ?? undefined;
  const phone = searchParams.get("phone") ?? undefined;
  const isActiveRaw = searchParams.get("isActive");
  const createdFrom = searchParams.get("createdFrom") ?? undefined;
  const createdTo = searchParams.get("createdTo") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  return {
    q,
    fullName,
    email,
    phone,
    isActive: isActiveRaw === null ? undefined : isActiveRaw === "true",
    createdFrom,
    createdTo,
    limit: limitRaw ? Number(limitRaw) : undefined,
    offset: offsetRaw ? Number(offsetRaw) : undefined,
  };
}

export async function listCustomersHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<CustomerListResultDto>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const data = await listCustomers(parseListParams(searchParams));
  return { success: true, data };
}

export async function getCustomerStatsHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<CustomerStatsDto>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const rangeRaw = searchParams.get("range");
  const range = rangeRaw === "month" ? "month" : "week";
  const data = await getCustomerStats(range);
  return { success: true, data };
}

export async function getCustomerHandler(
  ctx: BffContext,
): Promise<ApiResponse<CustomerDetailDto>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid customer id" } };
  }

  const data = await findCustomerById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } };
  }

  return { success: true, data };
}

export async function getCustomerLoginLogsHandler(
  ctx: BffContext,
): Promise<ApiResponse<CustomerLoginLogDto[]>> {
  const auth = await requirePermission("orders.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid customer id" } };
  }

  const existing = await findCustomerById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } };
  }

  const data = await listCustomerLoginLogs(id, 100);
  return { success: true, data };
}

export async function updateCustomerHandler(ctx: BffContext): Promise<ApiResponse<CustomerDetailDto>> {
  const auth = await requirePermission("orders.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid customer id" } };
  }

  const existing = await findCustomerById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } };
  }

  const parsed = updateCustomerSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const payload: {
    fullName?: string | null;
    phone?: string | null;
    email?: string;
    isActive?: boolean;
  } = {};

  if (parsed.data.fullName !== undefined) payload.fullName = parsed.data.fullName;
  if (parsed.data.phone !== undefined) payload.phone = parsed.data.phone;
  if (parsed.data.isActive !== undefined) payload.isActive = parsed.data.isActive;

  if (parsed.data.email !== undefined) {
    const trimmed = parsed.data.email?.trim() || "";
    if (!trimmed || isSyntheticCustomerEmail(trimmed)) {
      const phone = parsed.data.phone ?? existing.phone;
      payload.email = phone ? customerEmailFromPhone(phone) : existing.email;
    } else {
      const clash = await prisma.customer.findFirst({
        where: {
          email: trimmed,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (clash) {
        return {
          success: false,
          error: { code: "CONFLICT", message: "این ایمیل قبلاً ثبت شده است" },
        };
      }
      payload.email = trimmed;
    }
  }

  if (Object.keys(payload).length === 0) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "No fields to update" },
    };
  }

  await updateCustomer(id, payload);
  const data = await findCustomerById(id);

  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "customer.updated",
    entityType: "customer",
    entityId: id,
    snapshot: { before: customerAuditSnapshot(existing), after: customerAuditSnapshot(data) },
  });

  return { success: true, data: data! };
}

export async function deleteCustomerHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("orders.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid customer id" } };
  }

  const existing = await findCustomerById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Customer not found" } };
  }

  await softDeleteCustomer(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "customer.deleted",
    entityType: "customer",
    entityId: id,
    snapshot: customerAuditSnapshot(existing),
  });

  return { success: true, data: { ok: true } };
}
