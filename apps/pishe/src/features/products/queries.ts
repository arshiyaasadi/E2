"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBrandRequest,
  createCategoryRequest,
  createProductRequest,
  deleteBrandRequest,
  deleteCategoryRequest,
  deleteMediaRequest,
  deleteProductRequest,
  getBrandRequest,
  getCategoryRequest,
  getProductRequest,
  listBrandsRequest,
  listCategoriesRequest,
  listMediaLibraryRequest,
  listProductsRequest,
  mediaUsageRequest,
  patchBrandRequest,
  patchCategoryRequest,
  patchProductRequest,
  replaceMediaRequest,
  uploadMediaRequest,
} from "@/features/products/service";
import type { ProductUnit, ProductVariants } from "@/features/products/types";

export const PRODUCTS_KEY = ["products"] as const;
export const productKey = (id: string) => ["products", id] as const;
export const BRANDS_KEY = ["brands"] as const;
export const brandKey = (id: string) => ["brands", id] as const;
export const CATEGORIES_KEY = ["categories"] as const;
export const categoryKey = (id: string) => ["categories", id] as const;
export const MEDIA_LIBRARY_KEY = ["media-library"] as const;

export function useProductsQuery() {
  return useQuery({
    queryKey: PRODUCTS_KEY,
    queryFn: listProductsRequest,
    staleTime: 15_000,
  });
}

export function useProductQuery(id: string | undefined) {
  return useQuery({
    queryKey: productKey(id ?? ""),
    queryFn: () => getProductRequest(id!),
    enabled: Boolean(id),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProductRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function usePatchProductMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Parameters<typeof patchProductRequest>[1],
    ) => patchProductRequest(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(productKey(id), data);
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useUploadMediaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMediaRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_LIBRARY_KEY });
    },
  });
}

export function useReplaceMediaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, file }: { fileId: string; file: File }) =>
      replaceMediaRequest(fileId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      void queryClient.invalidateQueries({ queryKey: MEDIA_LIBRARY_KEY });
    },
  });
}

export function useDeleteMediaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      fileId,
      productId,
      confirmAll,
    }: {
      fileId: string;
      productId: string;
      confirmAll?: boolean;
    }) => deleteMediaRequest(fileId, productId, confirmAll),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useMediaUsageQuery(fileId: string | null) {
  return useQuery({
    queryKey: ["media-usage", fileId],
    queryFn: () => mediaUsageRequest(fileId!),
    enabled: Boolean(fileId),
  });
}

export function useMediaLibraryQuery() {
  return useQuery({
    queryKey: MEDIA_LIBRARY_KEY,
    queryFn: listMediaLibraryRequest,
    staleTime: 15_000,
  });
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: BRANDS_KEY,
    queryFn: listBrandsRequest,
    staleTime: 15_000,
  });
}

export function useBrandQuery(id: string | undefined) {
  return useQuery({
    queryKey: brandKey(id ?? ""),
    queryFn: () => getBrandRequest(id!),
    enabled: Boolean(id),
  });
}

export function useCreateBrandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBrandRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
    },
  });
}

export function usePatchBrandMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof patchBrandRequest>[1]) =>
      patchBrandRequest(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(brandKey(id), data);
      void queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
    },
  });
}

export function useDeleteBrandMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBrandRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: listCategoriesRequest,
    staleTime: 15_000,
  });
}

export function useCategoryQuery(id: string | undefined) {
  return useQuery({
    queryKey: categoryKey(id ?? ""),
    queryFn: () => getCategoryRequest(id!),
    enabled: Boolean(id),
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function usePatchCategoryMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof patchCategoryRequest>[1]) =>
      patchCategoryRequest(id, body),
    onSuccess: (data) => {
      queryClient.setQueryData(categoryKey(id), data);
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export type Stage2SaveInput = {
  unit: ProductUnit;
  variants?: ProductVariants;
};
