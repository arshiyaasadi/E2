import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type { AdminOverview } from "@/types/domain";

export async function fetchAdminOverview() {
  return apiClient.get<AdminOverview>(ENDPOINTS.ADMIN.OVERVIEW);
}
