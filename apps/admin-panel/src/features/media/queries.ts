"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMediaItem,
  fetchMedia,
  fetchMediaList,
  updateMediaItem,
  uploadMediaFile,
  type UploadMediaOptions,
} from "@/features/media/service";
import type { UpdateMediaInput } from "@/types/domain";

export function useMediaList(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["admin", "media", params ?? {}],
    queryFn: () => fetchMediaList(params),
  });
}

export function useMediaItem(mediaId: string | null) {
  return useQuery({
    queryKey: ["admin", "media", "item", mediaId],
    queryFn: () => fetchMedia(mediaId!),
    enabled: !!mediaId,
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, options }: { file: File; options?: UploadMediaOptions }) =>
      uploadMediaFile(file, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
    },
  });
}

export function useUpdateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, input }: { mediaId: string; input: UpdateMediaInput }) =>
      updateMediaItem(mediaId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "media", "item", variables.mediaId] });
    },
  });
}

export function useDeleteMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mediaId: string) => deleteMediaItem(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "media"] });
    },
  });
}
