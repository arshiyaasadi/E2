import { apiClient } from "@/lib/api/client";
import type { ReportsDashboardDto } from "@/types/domain";

export function fetchReportsDashboard() {
  return apiClient.get<ReportsDashboardDto>("/admin/reports");
}
