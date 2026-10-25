import { getSessionFromCookies } from "@/lib/api/server/session";
import { isAdminRole } from "@/config/roles";
import { getDatabaseSchema } from "@/lib/db/repositories/schema.repository";
import type { ApiResponse } from "@/types/api";
import type { SchemaTableGroup } from "@/lib/db/repositories/schema.repository";

export async function databaseSchemaHandler(): Promise<ApiResponse<SchemaTableGroup[]>> {
  const session = await getSessionFromCookies();
  if (!session || !isAdminRole(session.role)) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    };
  }

  const data = await getDatabaseSchema();
  return { success: true, data };
}
