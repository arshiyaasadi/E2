"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteCustomer,
  fetchCustomer,
  fetchCustomerLoginLogs,
  fetchCustomerStats,
  fetchCustomers,
  updateCustomer,
} from "@/features/customers/service";
import type { UpdateCustomerInput } from "@/types/domain";

export function useCustomers(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["admin", "customers", params ?? {}],
    queryFn: () => fetchCustomers(params),
  });
}

export function useCustomerStats(range: "week" | "month") {
  return useQuery({
    queryKey: ["admin", "customers", "stats", range],
    queryFn: () => fetchCustomerStats(range),
  });
}

export function useCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ["admin", "customers", customerId],
    queryFn: () => fetchCustomer(customerId!),
    enabled: !!customerId,
  });
}

export function useCustomerLoginLogs(customerId: string | null, enabled = false) {
  return useQuery({
    queryKey: ["admin", "customers", customerId, "login-logs"],
    queryFn: () => fetchCustomerLoginLogs(customerId!),
    enabled: !!customerId && enabled,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, input }: { customerId: string; input: UpdateCustomerInput }) =>
      updateCustomer(customerId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "customers", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}
