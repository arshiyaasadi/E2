import { apiClient } from "@/lib/api/client";
import type {
  CreateShippingMethodInput,
  OrderStatusDefinitionDto,
  PaymentGatewayDto,
  ShippingMethodDto,
  StoreSettingsDto,
  UpdatePaymentGatewayInput,
  UpdateShippingMethodInput,
  UpdateStoreSettingsInput,
} from "@/types/domain";

export function fetchStoreSettings() {
  return apiClient.get<StoreSettingsDto>("/admin/project/store-settings");
}

export function updateStoreSettings(input: UpdateStoreSettingsInput) {
  return apiClient.put<StoreSettingsDto>("/admin/project/store-settings", input);
}

export function fetchShippingMethods() {
  return apiClient.get<ShippingMethodDto[]>("/admin/project/shipping-methods");
}

export function createShippingMethod(input: CreateShippingMethodInput) {
  return apiClient.post<ShippingMethodDto>("/admin/project/shipping-methods", input);
}

export function updateShippingMethod(id: string, input: UpdateShippingMethodInput) {
  return apiClient.put<ShippingMethodDto>(`/admin/project/shipping-methods/${id}`, input);
}

export function deleteShippingMethod(id: string) {
  return apiClient.delete<{ ok: true }>(`/admin/project/shipping-methods/${id}`);
}

export function fetchPaymentGateways() {
  return apiClient.get<PaymentGatewayDto[]>("/admin/project/payment-gateways");
}

export function updatePaymentGateway(id: string, input: UpdatePaymentGatewayInput) {
  return apiClient.put<PaymentGatewayDto>(`/admin/project/payment-gateways/${id}`, input);
}

export function fetchOrderStatuses() {
  return apiClient.get<OrderStatusDefinitionDto[]>("/admin/project/order-statuses");
}
