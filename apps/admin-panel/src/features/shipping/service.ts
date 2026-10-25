import { apiClient } from "@/lib/api/client";
import type {
  InvokeShippingProviderInput,
  ShippingProviderDto,
  UpdateShippingProviderInput,
} from "@/types/domain";

export function fetchShippingProviders() {
  return apiClient.get<ShippingProviderDto[]>("/admin/project/shipping-providers");
}

export function updateShippingProvider(id: string, input: UpdateShippingProviderInput) {
  return apiClient.put<ShippingProviderDto>(`/admin/project/shipping-providers/${id}`, input);
}

export function invokeShippingProvider(id: string, input: InvokeShippingProviderInput) {
  return apiClient.post<unknown>(`/admin/project/shipping-providers/${id}/invoke`, input);
}
