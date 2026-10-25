"use client";

import { useMutation } from "@tanstack/react-query";
import { logoutRequest } from "@/features/auth/service";
import { useAuthStore } from "@/store/slices/auth.slice";

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearAuth();
      window.location.href = "/api/auth/oidc/logout";
    },
    onError: () => {
      clearAuth();
      window.location.href = "/api/auth/oidc/logout";
    },
  });
}
