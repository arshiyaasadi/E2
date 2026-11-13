/**
 * @level molecule
 * Applies persisted theme and listens for system preference changes.
 */
"use client";

import { useEffect } from "react";
import { useTheme } from "@/store/hooks/use-theme";
import { applyThemeClass } from "@/store/slices/ui.slice";

export function ThemeSync() {
  const theme = useTheme();

  useEffect(() => {
    applyThemeClass(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
