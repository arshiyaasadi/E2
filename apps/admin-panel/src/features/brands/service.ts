import { apiClient } from "@/lib/api/client";
import type { BrandDto, CreateBrandInput, UpdateBrandInput } from "@/types/domain";

export function fetchBrands() {
  return apiClient.get<BrandDto[]>("/admin/brands");
}

export function createBrand(input: CreateBrandInput) {
  return apiClient.post<BrandDto>("/admin/brands", input);
}

export function updateBrand(brandId: string, input: UpdateBrandInput) {
  return apiClient.put<BrandDto>(`/admin/brands/${brandId}`, input);
}

export function deleteBrand(brandId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/brands/${brandId}`);
}
