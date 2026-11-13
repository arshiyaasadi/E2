import { create } from "zustand";

export type AuthUser = {
  userId: string;
  username: string;
  displayName: string;
  firstName: string;
  lastName: string;
  mobile: string;
  shopName: string | null;
  avatarUrl: string | null;
  mustChangePassword: boolean;
  currency: "rial";
};

type AuthState = {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ user: null }),
}));
