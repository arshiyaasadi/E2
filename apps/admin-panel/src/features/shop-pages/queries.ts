"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShopPage,
  deleteShopPage,
  fetchShopPages,
  updateShopPage,
} from "@/features/shop-pages/service";
import type { CreateShopPageInput, UpdateShopPageInput } from "@/types/domain";

export function useShopPages() {
  return useQuery({
    queryKey: ["admin", "shop-pages"],
    queryFn: () => fetchShopPages(),
  });
}

export function useCreateShopPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShopPageInput) => createShopPage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shop-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateShopPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopPageId, input }: { shopPageId: string; input: UpdateShopPageInput }) =>
      updateShopPage(shopPageId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shop-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteShopPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shopPageId: string) => deleteShopPage(shopPageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shop-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}
