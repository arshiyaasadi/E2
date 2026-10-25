import { apiClient } from "@/lib/api/client";
import type { CreateTagInput, TagDto, UpdateTagInput } from "@/types/domain";

export function fetchTags() {
  return apiClient.get<TagDto[]>("/admin/tags");
}

export function createTag(input: CreateTagInput) {
  return apiClient.post<TagDto>("/admin/tags", input);
}

export function updateTag(tagId: string, input: UpdateTagInput) {
  return apiClient.put<TagDto>(`/admin/tags/${tagId}`, input);
}

export function deleteTag(tagId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/tags/${tagId}`);
}
