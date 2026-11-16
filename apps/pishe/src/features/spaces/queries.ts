"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBusinessTelegramRequest,
  getMyUsageRequest,
  patchTelegramConfigRequest,
  prepareBusinessTelegramRequest,
  unlinkBusinessTelegramRequest,
} from "@/features/spaces/service";

export const MY_USAGE_KEY = ["usage", "me"] as const;
export const businessTelegramKey = (businessId: string) =>
  ["businesses", businessId, "telegram"] as const;

export function useMyUsageQuery(enabled = true) {
  return useQuery({
    queryKey: MY_USAGE_KEY,
    queryFn: async () => {
      const data = await getMyUsageRequest();
      return data.usage;
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useBusinessTelegramQuery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: businessTelegramKey(businessId),
    queryFn: async () => {
      const data = await getBusinessTelegramRequest(businessId);
      return data.telegram;
    },
    enabled: enabled && Boolean(businessId),
    staleTime: 10_000,
  });
}

export function usePrepareTelegramMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => prepareBusinessTelegramRequest(businessId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: businessTelegramKey(businessId) });
    },
  });
}

export function usePatchTelegramConfigMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof patchTelegramConfigRequest>[1],
    ) => patchTelegramConfigRequest(businessId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: businessTelegramKey(businessId) });
    },
  });
}

export function useUnlinkTelegramMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unlinkBusinessTelegramRequest(businessId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: businessTelegramKey(businessId) });
    },
  });
}
