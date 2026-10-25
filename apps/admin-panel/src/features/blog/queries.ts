"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlogCategory,
  createBlogPost,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogPost,
  deleteBlogTag,
  fetchBlogCategories,
  fetchBlogPost,
  fetchBlogPosts,
  fetchBlogTags,
  fetchPublicBlogPost,
  fetchPublicBlogPosts,
  patchBlogPost,
  previewBlogPost,
  searchBlogInternalLinks,
  updateBlogCategory,
  updateBlogPost,
  updateBlogTag,
} from "@/features/blog/service";
import type {
  CreateBlogCategoryInput,
  CreateBlogPostInput,
  CreateBlogTagInput,
  PatchBlogPostInput,
  UpdateBlogCategoryInput,
  UpdateBlogPostInput,
  UpdateBlogTagInput,
} from "@/types/domain";

export function useBlogCategories() {
  return useQuery({
    queryKey: ["admin", "blog-categories"],
    queryFn: () => fetchBlogCategories(),
  });
}

export function useCreateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlogCategoryInput) => createBlogCategory(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlogCategoryInput }) =>
      updateBlogCategory(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteBlogCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-categories"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useBlogTags() {
  return useQuery({
    queryKey: ["admin", "blog-tags"],
    queryFn: () => fetchBlogTags(),
  });
}

export function useCreateBlogTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlogTagInput) => createBlogTag(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-tags"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateBlogTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlogTagInput }) =>
      updateBlogTag(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-tags"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useDeleteBlogTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-tags"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useBlogPosts(filters?: { status?: string; categoryId?: string; q?: string }) {
  return useQuery({
    queryKey: ["admin", "blog-posts", filters ?? {}],
    queryFn: () => fetchBlogPosts(filters),
  });
}

export function useBlogPost(id: string | null) {
  return useQuery({
    queryKey: ["admin", "blog-posts", id],
    queryFn: () => fetchBlogPost(id!),
    enabled: !!id,
  });
}

export function useBlogPostPreview(id: string | null) {
  return useQuery({
    queryKey: ["admin", "blog-posts", id, "preview"],
    queryFn: () => previewBlogPost(id!),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlogPostInput) => createBlogPost(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useUpdateBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlogPostInput }) =>
      updateBlogPost(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts", vars.id] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function usePatchBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PatchBlogPostInput }) =>
      patchBlogPost(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts", vars.id] });
    },
  });
}

export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useBlogInternalLinkSearch(q: string) {
  return useQuery({
    queryKey: ["admin", "blog-internal-links", q],
    queryFn: () => searchBlogInternalLinks(q),
    enabled: q.trim().length >= 1,
  });
}

export function usePublicBlogPosts() {
  return useQuery({
    queryKey: ["public", "blog-posts"],
    queryFn: () => fetchPublicBlogPosts(),
  });
}

export function usePublicBlogPost(slug: string) {
  return useQuery({
    queryKey: ["public", "blog-posts", slug],
    queryFn: () => fetchPublicBlogPost(slug),
    enabled: !!slug,
  });
}
