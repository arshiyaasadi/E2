import { apiClient } from "@/lib/api/client";
import type { OrderDetailDto, OrderListResultDto, UpdateOrderStatusInput } from "@/types/domain";

export function fetchOrders(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.customerId) search.set("customerId", params.customerId);
  if (params?.limit) search.set("limit", params.limit);
  if (params?.offset) search.set("offset", params.offset);
  const qs = search.toString();
  return apiClient.get<OrderListResultDto>(`/admin/orders${qs ? `?${qs}` : ""}`);
}

export function fetchOrder(orderId: string) {
  return apiClient.get<OrderDetailDto>(`/admin/orders/${orderId}`);
}

export function updateOrderStatus(orderId: string, input: UpdateOrderStatusInput) {
  return apiClient.put<OrderDetailDto>(`/admin/orders/${orderId}/status`, input);
}

export function approveOrderPayment(orderId: string, paymentId: string) {
  return apiClient.post<OrderDetailDto>(
    `/admin/orders/${orderId}/payments/${paymentId}/approve`,
    {},
  );
}

export function rejectOrderPayment(orderId: string, paymentId: string, reason: string) {
  return apiClient.post<OrderDetailDto>(
    `/admin/orders/${orderId}/payments/${paymentId}/reject`,
    { reason },
  );
}
