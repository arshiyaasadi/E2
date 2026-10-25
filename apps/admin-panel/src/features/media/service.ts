import { apiClient, ApiClientError } from "@/lib/api/client";
import { BFF_API_BASE } from "@/lib/api/endpoints";
import type { MediaDetailDto, MediaDto, MediaListResultDto, UpdateMediaInput } from "@/types/domain";

export interface UploadMediaOptions {
  folder?: string;
  altText?: string;
  title?: string;
}

export async function uploadMediaFile(file: File, options: UploadMediaOptions = {}) {
  const formData = new FormData();
  formData.append("file", file);
  if (options.folder) formData.append("folder", options.folder);
  if (options.altText) formData.append("altText", options.altText);
  if (options.title) formData.append("title", options.title);

  const response = await fetch(`${BFF_API_BASE}/media/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = (await response.json()) as
    | { success: true; data: MediaDto }
    | { success: false; error?: { message?: string; code?: string } };

  if (!response.ok || !payload.success) {
    const err = payload as { error?: { message?: string; code?: string } };
    const message = err.error?.message ?? "Upload failed";
    throw new ApiClientError(message, err.error?.code ?? "UPLOAD_FAILED", response.status);
  }

  return payload.data;
}

export { MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";

export function fetchMediaList(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.mimeType) search.set("mimeType", params.mimeType);
  if (params?.folder) search.set("folder", params.folder);
  if (params?.limit) search.set("limit", params.limit);
  if (params?.offset) search.set("offset", params.offset);
  const qs = search.toString();
  return apiClient.get<MediaListResultDto>(`/admin/media${qs ? `?${qs}` : ""}`);
}

export function fetchMedia(mediaId: string) {
  return apiClient.get<MediaDetailDto>(`/admin/media/${mediaId}`);
}

export function updateMediaItem(mediaId: string, input: UpdateMediaInput) {
  return apiClient.put<MediaDto>(`/admin/media/${mediaId}`, input);
}

export function deleteMediaItem(mediaId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/media/${mediaId}`);
}
