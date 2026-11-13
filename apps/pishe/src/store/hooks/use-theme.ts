import { useUiStore, type ThemeMode } from "@/store/slices/ui.slice";

export function useTheme(): ThemeMode {
  return useUiStore((s) => s.theme);
}

export function useSetTheme() {
  return useUiStore((s) => s.setTheme);
}
