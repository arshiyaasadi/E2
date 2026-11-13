"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  sessionsRequest,
  updateProfileRequest,
} from "@/features/auth/service";
import { useAuthStore, type AuthUser } from "@/store/slices/auth.slice";
import type { AuthUserResponse } from "@/types/api";

const ME_KEY = ["auth", "me"] as const;
export const SESSIONS_KEY = ["auth", "sessions"] as const;

function toAuthUser(data: AuthUserResponse): AuthUser {
  return {
    userId: data.userId,
    username: data.username,
    displayName: data.displayName,
    firstName: data.firstName ?? "",
    lastName: data.lastName ?? "",
    mobile: data.mobile ?? data.username,
    shopName: data.shopName,
    avatarUrl: data.avatarUrl,
    mustChangePassword: data.mustChangePassword,
    currency: data.currency ?? "rial",
  };
}

export function useMeQuery(enabled = true) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const data = await meRequest();
        const user = toAuthUser(data);
        setUser(user);
        return user;
      } catch {
        setUser(null);
        return null;
      } finally {
        setHydrated(true);
      }
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      const user = toAuthUser(data);
      setUser(user);
      queryClient.setQueryData(ME_KEY, user);
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: registerRequest,
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clear();
      queryClient.setQueryData(ME_KEY, null);
      queryClient.clear();
    },
  });
}

export function useSessionsQuery(enabled = false) {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => {
      const data = await sessionsRequest();
      return data.sessions;
    },
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: (data) => {
      const user = toAuthUser(data);
      setUser(user);
      queryClient.setQueryData(ME_KEY, user);
    },
  });
}
