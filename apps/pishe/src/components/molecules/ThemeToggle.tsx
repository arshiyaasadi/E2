/**
 * @level molecule
 * @spacing internal: gap-atom | external: none
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useSetTheme, useTheme } from "@/store/hooks/use-theme";
import { applyThemeClass, type ThemeMode } from "@/store/slices/ui.slice";

const OPTIONS: { value: ThemeMode; icon: typeof Sun; labelKey: "themeLight" | "themeDark" | "themeSystem" }[] =
  [
    { value: "light", icon: Sun, labelKey: "themeLight" },
    { value: "dark", icon: Moon, labelKey: "themeDark" },
    { value: "system", icon: Monitor, labelKey: "themeSystem" },
  ];

export function ThemeToggle() {
  const theme = useTheme();
  const setTheme = useSetTheme();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyThemeClass(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ActiveIcon =
    OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={t("toggleTheme")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-control-sm items-center gap-atom-md rounded-md border border-border bg-surface px-pad-atom-md text-sm text-foreground",
          "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
      >
        <ActiveIcon className="size-4 text-primary" aria-hidden />
        <span className="hidden sm:inline">
          {t(OPTIONS.find((o) => o.value === theme)?.labelKey ?? "themeSystem")}
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("toggleTheme")}
          className="absolute end-0 top-[calc(100%+0.5rem)] z-20 min-w-40 overflow-hidden rounded-md border border-border bg-surface p-pad-atom shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
        >
          {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full items-center gap-atom-md px-pad-mol py-pad-atom-md text-sm",
                  selected
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-surface-2",
                )}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
              >
                <Icon className="size-4" aria-hidden />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
