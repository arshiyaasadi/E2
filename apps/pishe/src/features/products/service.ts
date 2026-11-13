import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  BrandListItem,
  CategoryListItem,
  DashboardStats,
  ProductListItem,
  ProductVariants,
  ProductUnit,
} from "@/features/products/types";

export type ProductsListResponse = {
  products: ProductListItem[];
  stats: DashboardStats;
};

export type UploadedMedia = {
  fileId: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export async function listProductsRequest() {
  return apiClient.get<ProductsListResponse>(ENDPOINTS.products.list);
}

export async function getProductRequest(id: string) {
  return apiClient.get<ProductListItem>(ENDPOINTS.products.byId(id));
}

export async function createProductRequest(body: {
  title: string;
  priceRial: number;
  description?: string;
  mediaIds: string[];
  brandId?: string | null;
  categoryId?: string | null;
  groupCategoryIds?: string[];
}) {
  return apiClient.post<ProductListItem>(ENDPOINTS.products.list, body);
}

export async function patchProductRequest(
  id: string,
  body: {
    title?: string;
    priceRial?: number;
    description?: string;
    mediaIds?: string[];
    brandId?: string | null;
    categoryId?: string | null;
    groupCategoryIds?: string[];
    unit?: ProductUnit;
    variants?: ProductVariants;
    complete?: true;
  },
) {
  return apiClient.patch<ProductListItem>(ENDPOINTS.products.byId(id), body);
}

export async function deleteProductRequest(id: string) {
  return apiClient.delete<{ id: string }>(ENDPOINTS.products.byId(id));
}

export async function uploadMediaRequest(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiClient.upload<UploadedMedia>(ENDPOINTS.media.upload, form);
}

export async function replaceMediaRequest(fileId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiClient.putUpload<
    UploadedMedia & { affectedProducts: { id: string; title: string }[] }
  >(ENDPOINTS.media.byId(fileId), form);
}

export async function deleteMediaRequest(
  fileId: string,
  productId: string,
  confirmAll = false,
) {
  const qs = new URLSearchParams({
    productId,
    ...(confirmAll ? { confirmAll: "true" } : {}),
  });
  return apiClient.delete<{ fileId: string }>(
    `${ENDPOINTS.media.byId(fileId)}?${qs.toString()}`,
  );
}

export async function mediaUsageRequest(fileId: string) {
  return apiClient.get<{
    fileId: string;
    products: { id: string; title: string }[];
  }>(ENDPOINTS.media.usage(fileId));
}

export async function listMediaLibraryRequest() {
  return apiClient.get<
    {
      fileId: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
      productCount: number;
      updatedAt: string;
    }[]
  >(ENDPOINTS.media.library);
}

export async function listBrandsRequest() {
  return apiClient.get<BrandListItem[]>(ENDPOINTS.brands.list);
}

export async function getBrandRequest(id: string) {
  return apiClient.get<BrandListItem>(ENDPOINTS.brands.byId(id));
}

export async function createBrandRequest(body: {
  name: string;
  description?: string;
  imageId?: string | null;
}) {
  return apiClient.post<BrandListItem>(ENDPOINTS.brands.list, body);
}

export async function patchBrandRequest(
  id: string,
  body: {
    name?: string;
    description?: string;
    imageId?: string | null;
  },
) {
  return apiClient.patch<BrandListItem>(ENDPOINTS.brands.byId(id), body);
}

export async function deleteBrandRequest(id: string) {
  return apiClient.delete<{ id: string }>(ENDPOINTS.brands.byId(id));
}

export async function listCategoriesRequest() {
  return apiClient.get<CategoryListItem[]>(ENDPOINTS.categories.list);
}

export async function getCategoryRequest(id: string) {
  return apiClient.get<CategoryListItem>(ENDPOINTS.categories.byId(id));
}

export async function createCategoryRequest(body: {
  name: string;
  kind: "real" | "virtual";
  parentId?: string | null;
  description?: string;
  imageId?: string | null;
}) {
  return apiClient.post<CategoryListItem>(ENDPOINTS.categories.list, body);
}

export async function patchCategoryRequest(
  id: string,
  body: {
    name?: string;
    parentId?: string | null;
    description?: string;
    imageId?: string | null;
  },
) {
  return apiClient.patch<CategoryListItem>(ENDPOINTS.categories.byId(id), body);
}

export async function deleteCategoryRequest(id: string) {
  return apiClient.delete<{ id: string }>(ENDPOINTS.categories.byId(id));
}
