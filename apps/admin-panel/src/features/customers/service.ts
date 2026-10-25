import { apiClient } from "@/lib/api/client";
import type {
  CustomerDetailDto,
  CustomerListResultDto,
  CustomerLoginLogDto,
  CustomerStatsDto,
  UpdateCustomerInput,
} from "@/types/domain";

export function fetchCustomers(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.fullName) search.set("fullName", params.fullName);
  if (params?.email) search.set("email", params.email);
  if (params?.phone) search.set("phone", params.phone);
  if (params?.isActive !== undefined) search.set("isActive", params.isActive);
  if (params?.createdFrom) search.set("createdFrom", params.createdFrom);
  if (params?.createdTo) search.set("createdTo", params.createdTo);
  if (params?.limit) search.set("limit", params.limit);
  if (params?.offset) search.set("offset", params.offset);
  const qs = search.toString();
  return apiClient.get<CustomerListResultDto>(`/admin/customers${qs ? `?${qs}` : ""}`);
}

export function fetchCustomerStats(range: "week" | "month" = "week") {
  return apiClient.get<CustomerStatsDto>(`/admin/customers/stats?range=${range}`);
}

export function fetchCustomer(customerId: string) {
  return apiClient.get<CustomerDetailDto>(`/admin/customers/${customerId}`);
}

export function fetchCustomerLoginLogs(customerId: string) {
  return apiClient.get<CustomerLoginLogDto[]>(`/admin/customers/${customerId}/login-logs`);
}

export function updateCustomer(customerId: string, input: UpdateCustomerInput) {
  return apiClient.put<CustomerDetailDto>(`/admin/customers/${customerId}`, input);
}

export function deleteCustomer(customerId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/customers/${customerId}`);
}
