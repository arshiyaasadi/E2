"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchShippingProviders,
  invokeShippingProvider,
  updateShippingProvider,
} from "@/features/shipping/service";
import type { InvokeShippingProviderInput, UpdateShippingProviderInput } from "@/types/domain";

export function useShippingProviders() {
  return useQuery({
    queryKey: ["admin", "project", "shipping-providers"],
    queryFn: fetchShippingProviders,
  });
}

export function useUpdateShippingProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateShippingProviderInput }) =>
      updateShippingProvider(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "shipping-providers"] });
    },
  });
}

export function useInvokeShippingProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvokeShippingProviderInput }) =>
      invokeShippingProvider(id, input),
    onSuccess: (_data, vars) => {
      if (vars.input.action === "obtainToken" || vars.input.action === "refreshToken") {
        queryClient.invalidateQueries({ queryKey: ["admin", "project", "shipping-providers"] });
      }
    },
  });
}
