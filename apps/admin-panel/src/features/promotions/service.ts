import { apiClient } from "@/lib/api/client";
import type { CreatePromotionInput, PromotionDto, UpdatePromotionInput } from "@/types/domain";

export function fetchPromotions() {
  return apiClient.get<PromotionDto[]>("/admin/promotions");
}

export function createPromotion(input: CreatePromotionInput) {
  return apiClient.post<PromotionDto>("/admin/promotions", input);
}

export function updatePromotion(promotionId: string, input: UpdatePromotionInput) {
  return apiClient.put<PromotionDto>(`/admin/promotions/${promotionId}`, input);
}

export function deletePromotion(promotionId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/promotions/${promotionId}`);
}
