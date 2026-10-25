import { apiClient } from "@/lib/api/client";
import type { CouponDto, CreateCouponInput, UpdateCouponInput } from "@/types/domain";

export function fetchCoupons() {
  return apiClient.get<CouponDto[]>("/admin/coupons");
}

export function createCoupon(input: CreateCouponInput) {
  return apiClient.post<CouponDto>("/admin/coupons", input);
}

export function updateCoupon(couponId: string, input: UpdateCouponInput) {
  return apiClient.put<CouponDto>(`/admin/coupons/${couponId}`, input);
}

export function deleteCoupon(couponId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/coupons/${couponId}`);
}
