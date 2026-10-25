"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHomepageSection,
  deleteHomepageSection,
  fetchHomepageSections,
  reorderHomepageSection,
  updateHomepageSection,
} from "@/features/homepage/service";
import type {
  CreateHomepageSectionInput,
  UpdateHomepageSectionInput,
} from "@/types/domain";

export function useHomepageSections() {
  return useQuery({
    queryKey: ["admin", "homepage-sections"],
    queryFn: () => fetchHomepageSections(),
  });
}

export function useCreateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHomepageSectionInput) => createHomepageSection(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      input,
    }: {
      sectionId: string;
      input: UpdateHomepageSectionInput;
    }) => updateHomepageSection(sectionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => deleteHomepageSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useReorderHomepageSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, otherId }: { sectionId: string; otherId: string }) =>
      reorderHomepageSection(sectionId, otherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}
