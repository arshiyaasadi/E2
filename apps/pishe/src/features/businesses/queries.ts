"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMemberRequest,
  createBusinessRequest,
  deleteBusinessRequest,
  listAdminBusinessesRequest,
  listMembersRequest,
  listMyBusinessesRequest,
  patchBusinessRequest,
  removeMemberRequest,
  type BusinessWriteInput,
} from "@/features/businesses/service";

export const MY_BUSINESSES_KEY = ["businesses", "mine"] as const;
export const ADMIN_BUSINESSES_KEY = ["businesses", "admin"] as const;
export const membersKey = (businessId: string) =>
  ["businesses", businessId, "members"] as const;

export function useMyBusinessesQuery(enabled = true) {
  return useQuery({
    queryKey: MY_BUSINESSES_KEY,
    queryFn: async () => {
      const data = await listMyBusinessesRequest();
      return data.businesses;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminBusinessesQuery(enabled = false) {
  return useQuery({
    queryKey: ADMIN_BUSINESSES_KEY,
    queryFn: async () => {
      const data = await listAdminBusinessesRequest();
      return data.businesses;
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useCreateBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessWriteInput) => createBusinessRequest(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BUSINESSES_KEY });
      void qc.invalidateQueries({ queryKey: MY_BUSINESSES_KEY });
    },
  });
}

export function usePatchBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: Partial<BusinessWriteInput> }) =>
      patchBusinessRequest(input.id, input.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BUSINESSES_KEY });
      void qc.invalidateQueries({ queryKey: MY_BUSINESSES_KEY });
    },
  });
}

export function useDeleteBusinessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBusinessRequest(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BUSINESSES_KEY });
      void qc.invalidateQueries({ queryKey: MY_BUSINESSES_KEY });
    },
  });
}

export function useMembersQuery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: membersKey(businessId),
    queryFn: async () => {
      const data = await listMembersRequest(businessId);
      return data.members;
    },
    enabled: enabled && Boolean(businessId),
    staleTime: 15_000,
  });
}

export function useAddMemberMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      inviteCode: string;
      role: "MANAGER" | "ASSISTANT";
    }) => addMemberRequest(businessId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: membersKey(businessId) });
    },
  });
}

export function useRemoveMemberMutation(businessId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      removeMemberRequest(businessId, membershipId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: membersKey(businessId) });
    },
  });
}
