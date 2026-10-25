import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { AuthUser } from "@/types/domain";

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  permissions: string[];
  setAuth: (payload: AuthUser & { token?: string | null }) => void;
  clearAuth: () => void;
  hasPermission: (key: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  role: null,
  userId: null,
  email: null,
  fullName: null,
  permissions: [],
  setAuth: (payload) =>
    set((state) => {
      const next = {
        token: payload.token ?? "cookie",
        role: payload.role,
        userId: payload.userId,
        email: payload.email,
        fullName: payload.fullName,
        permissions: payload.permissions ?? [],
      };

      if (
        state.token === next.token &&
        state.role === next.role &&
        state.userId === next.userId &&
        state.email === next.email &&
        state.fullName === next.fullName &&
        state.permissions.join("|") === next.permissions.join("|")
      ) {
        return state;
      }

      return next;
    }),
  clearAuth: () =>
    set((state) => {
      if (
        state.token === null &&
        state.role === null &&
        state.userId === null &&
        state.email === null &&
        state.fullName === null &&
        state.permissions.length === 0
      ) {
        return state;
      }

      return {
        token: null,
        role: null,
        userId: null,
        email: null,
        fullName: null,
        permissions: [],
      };
    }),
  hasPermission: (key) => get().permissions.includes(key),
}));

export function useAuthUser() {
  return useAuthStore(
    useShallow((state) => ({
      userId: state.userId,
      email: state.email,
      fullName: state.fullName,
      role: state.role,
      permissions: state.permissions,
    })),
  );
}

export function useHasPermission(key: string) {
  return useAuthStore((state) => state.permissions.includes(key));
}
