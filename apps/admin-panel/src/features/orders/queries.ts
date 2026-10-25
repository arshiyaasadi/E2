"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrder, fetchOrders, updateOrderStatus, approveOrderPayment, rejectOrderPayment } from "@/features/orders/service";
import type { UpdateOrderStatusInput } from "@/types/domain";

export function useOrders(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["admin", "orders", params ?? {}],
    queryFn: () => fetchOrders(params),
  });
}

export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ["admin", "orders", orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: !!orderId,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: string; input: UpdateOrderStatusInput }) =>
      updateOrderStatus(orderId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useApproveOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, paymentId }: { orderId: string; paymentId: string }) =>
      approveOrderPayment(orderId, paymentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useRejectOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      paymentId,
      reason,
    }: {
      orderId: string;
      paymentId: string;
      reason: string;
    }) => rejectOrderPayment(orderId, paymentId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}
