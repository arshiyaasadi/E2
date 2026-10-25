"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSmsProviders,
  invokeSmsProvider,
  updateSmsProvider,
} from "@/features/sms/service";
import type { InvokeSmsProviderInput, UpdateSmsProviderInput } from "@/types/domain";

export function useSmsProviders() {
  return useQuery({
    queryKey: ["admin", "project", "sms-providers"],
    queryFn: fetchSmsProviders,
  });
}

export function useUpdateSmsProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSmsProviderInput }) =>
      updateSmsProvider(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "project", "sms-providers"] });
    },
  });
}

export function useInvokeSmsProvider() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvokeSmsProviderInput }) =>
      invokeSmsProvider(id, input),
  });
}
