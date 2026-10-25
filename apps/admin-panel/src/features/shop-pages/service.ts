import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import type { CreateShopPageInput, ShopPageDto, UpdateShopPageInput } from "@/types/domain";

export function fetchShopPages() {
  return apiClient.get<ShopPageDto[]>(ENDPOINTS.ADMIN.SHOP_PAGES.ROOT);
}

export function fetchShopPage(shopPageId: string) {
  return apiClient.get<ShopPageDto>(ENDPOINTS.ADMIN.SHOP_PAGES.BY_ID(shopPageId));
}

export function createShopPage(input: CreateShopPageInput) {
  return apiClient.post<ShopPageDto>(ENDPOINTS.ADMIN.SHOP_PAGES.ROOT, input);
}

export function updateShopPage(shopPageId: string, input: UpdateShopPageInput) {
  return apiClient.put<ShopPageDto>(ENDPOINTS.ADMIN.SHOP_PAGES.BY_ID(shopPageId), input);
}

export function deleteShopPage(shopPageId: string) {
  return apiClient.delete<{ ok: true }>(ENDPOINTS.ADMIN.SHOP_PAGES.BY_ID(shopPageId));
}
