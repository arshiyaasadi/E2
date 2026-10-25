import { create } from "zustand";

const STORAGE_KEY = "admin-sidebar-collapsed";

interface UiState {
  sidebarCollapsed: boolean;
  sidebarHydrated: boolean;
  hydrateSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
}

function readCollapsedPreference() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function persistCollapsedPreference(collapsed: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(collapsed));
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  sidebarHydrated: false,
  hydrateSidebar: () =>
    set({
      sidebarCollapsed: readCollapsedPreference(),
      sidebarHydrated: true,
    }),
  setSidebarCollapsed: (collapsed) => {
    persistCollapsedPreference(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () =>
    set((state) => {
      const collapsed = !state.sidebarCollapsed;
      persistCollapsedPreference(collapsed);
      return { sidebarCollapsed: collapsed };
    }),
}));

export const selectSidebarCollapsed = (state: UiState) => state.sidebarCollapsed;
