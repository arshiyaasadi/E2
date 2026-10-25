"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api/client";
import type { LoginResponse } from "@/types/api";
import { useAuthStore } from "@/store/slices/auth.slice";

export function AuthHydrator() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    apiClient
      .get<LoginResponse>("/auth/me")
      .then((data) => useAuthStore.getState().setAuth(data))
      .catch(() => undefined);
  }, []);

  return null;
}
