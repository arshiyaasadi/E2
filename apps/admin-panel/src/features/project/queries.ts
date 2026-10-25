"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShippingMethod,
  deleteShippingMethod,
  fetchOrderStatuses,
  fetchPaymentGateways,
  fetchShippingMethods,
  fetchStoreSettings,
  updatePaymentGateway,
  updateShippingMethod,
  updateStoreSettings,
} from "@/features/project/service";
import type {
  CreateShippingMethodInput,
  UpdatePaymentGatewayInput,
  UpdateShippingMethodInput,
  UpdateStoreSettingsInput,
} from "@/types/domain";

export function useStoreSettings() {
  return useQuery({
    queryKey: ["admin", "project", "store-settings"],
    queryFn: fetchStoreSettings,
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStoreSettingsInput) => updateStoreSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "store-settings"] });
    },
  });
}

export function useShippingMethods() {
  return useQuery({
    queryKey: ["admin", "project", "shipping-methods"],
    queryFn: fetchShippingMethods,
  });
}

export function useCreateShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShippingMethodInput) => createShippingMethod(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "shipping-methods"] });
    },
  });
}

export function useUpdateShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShippingMethodInput }) =>
      updateShippingMethod(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "shipping-methods"] });
    },
  });
}

export function useDeleteShippingMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShippingMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "shipping-methods"] });
    },
  });
}

export function usePaymentGateways() {
  return useQuery({
    queryKey: ["admin", "project", "payment-gateways"],
    queryFn: fetchPaymentGateways,
  });
}

export function useUpdatePaymentGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePaymentGatewayInput }) =>
      updatePaymentGateway(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "payment-gateways"] });
    },
  });
}

export function useOrderStatuses() {
  return useQuery({
    queryKey: ["admin", "project", "order-statuses"],
    queryFn: fetchOrderStatuses,
  });
}
