import { requirePermission } from "@/lib/api/server/auth-guard";
import { getReportsDashboard } from "@/lib/db/repositories/reports.repository";
import type { ApiResponse } from "@/types/api";
import type { ReportsDashboardDto } from "@/types/domain";

export async function getReportsDashboardHandler(): Promise<ApiResponse<ReportsDashboardDto>> {
  const auth = await requirePermission("reports.view");
  if (!auth.ok) return auth.response;

  return { success: true, data: await getReportsDashboard() };
}
