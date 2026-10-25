import { apiClient } from "@/lib/api/client";
import type {
  BlogCategoryDto,
  BlogPostDto,
  BlogPostListItemDto,
  BlogTagDto,
  CreateBlogCategoryInput,
  CreateBlogPostInput,
  CreateBlogTagInput,
  PatchBlogPostInput,
  UpdateBlogCategoryInput,
  UpdateBlogPostInput,
  UpdateBlogTagInput,
} from "@/types/domain";

export function fetchBlogCategories() {
  return apiClient.get<BlogCategoryDto[]>("/admin/blog/categories");
}

export function createBlogCategory(input: CreateBlogCategoryInput) {
  return apiClient.post<BlogCategoryDto>("/admin/blog/categories", input);
}

export function updateBlogCategory(id: string, input: UpdateBlogCategoryInput) {
  return apiClient.put<BlogCategoryDto>(`/admin/blog/categories/${id}`, input);
}

export function deleteBlogCategory(id: string) {
  return apiClient.delete<{ ok: true }>(`/admin/blog/categories/${id}`);
}

export function fetchBlogTags() {
  return apiClient.get<BlogTagDto[]>("/admin/blog/tags");
}

export function createBlogTag(input: CreateBlogTagInput) {
  return apiClient.post<BlogTagDto>("/admin/blog/tags", input);
}

export function updateBlogTag(id: string, input: UpdateBlogTagInput) {
  return apiClient.put<BlogTagDto>(`/admin/blog/tags/${id}`, input);
}

export function deleteBlogTag(id: string) {
  return apiClient.delete<{ ok: true }>(`/admin/blog/tags/${id}`);
}

export function fetchBlogPosts(params?: { status?: string; categoryId?: string; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.categoryId) sp.set("categoryId", params.categoryId);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  return apiClient.get<BlogPostListItemDto[]>(`/admin/blog/posts${qs ? `?${qs}` : ""}`);
}

export function fetchBlogPost(id: string) {
  return apiClient.get<BlogPostDto>(`/admin/blog/posts/${id}`);
}

export function previewBlogPost(id: string) {
  return apiClient.get<BlogPostDto>(`/admin/blog/posts/${id}/preview`);
}

export function createBlogPost(input: CreateBlogPostInput) {
  return apiClient.post<BlogPostDto>("/admin/blog/posts", input);
}

export function updateBlogPost(id: string, input: UpdateBlogPostInput) {
  return apiClient.put<BlogPostDto>(`/admin/blog/posts/${id}`, input);
}

export function patchBlogPost(id: string, input: PatchBlogPostInput) {
  return apiClient.patch<BlogPostDto>(`/admin/blog/posts/${id}`, input);
}

export function deleteBlogPost(id: string) {
  return apiClient.delete<{ ok: true }>(`/admin/blog/posts/${id}`);
}

export function searchBlogInternalLinks(q: string) {
  return apiClient.get<{
    posts: Array<{ id: string; titleFa: string; slug: string; href: string }>;
    products: Array<{ id: string; title: string; slug: string; href: string }>;
  }>(`/admin/blog/internal-links?q=${encodeURIComponent(q)}`);
}

export function fetchPublicBlogPosts() {
  return apiClient.get<BlogPostListItemDto[]>("/blog/posts");
}

export function fetchPublicBlogPost(slug: string) {
  return apiClient.get<BlogPostDto>(`/blog/posts/${encodeURIComponent(slug)}`);
}
