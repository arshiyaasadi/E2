import { apiClient } from "@/lib/api/client";
import type {
  CreateProductInput,
  ProductDetailDto,
  ProductDto,
  ProductListFilters,
  UpdateProductInput,
} from "@/types/domain";

function buildQuery(filters: ProductListFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.productType) params.set("productType", filters.productType);
  if (filters.brandId) params.set("brandId", filters.brandId);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchProducts(filters?: ProductListFilters) {
  return apiClient.get<ProductDto[]>(`/admin/products${buildQuery(filters)}`);
}

export function fetchProductDetail(productId: string) {
  return apiClient.get<ProductDetailDto>(`/admin/products/${productId}/detail`);
}

export function createProduct(input: CreateProductInput) {
  return apiClient.post<ProductDto>("/admin/products", input);
}

export function updateProduct(productId: string, input: UpdateProductInput) {
  return apiClient.put<ProductDto>(`/admin/products/${productId}`, input);
}

export function deleteProduct(productId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/products/${productId}`);
}
