import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";

export async function logoutRequest() {
  return apiClient.post<{ ok: true }>(ENDPOINTS.AUTH.LOGOUT);
}

export async function refreshSessionRequest() {
  return apiClient.post(ENDPOINTS.AUTH.REFRESH);
}
