import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api/server/auth-guard";
import { listAuditLogs, mapAuditLogRow } from "@/lib/db/repositories/audit.repository";
import { optionalUuidSchema } from "@/lib/validation/uuid";
import type { ApiResponse } from "@/types/api";
import type { AuditLogDto } from "@/types/domain";

const querySchema = z.object({
  entityType: z.string().max(80).optional(),
  entityId: optionalUuidSchema,
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function listAuditLogsHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<AuditLogDto[]>> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const parsed = querySchema.safeParse({
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid query" },
    };
  }

  const rows = await listAuditLogs({
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    limit: parsed.data.limit,
  });

  return { success: true, data: rows.map(mapAuditLogRow) };
}
