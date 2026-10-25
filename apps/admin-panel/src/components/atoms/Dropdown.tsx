/**
 * @level atom
 * @spacing internal: mt-atom py-atom (panel), px-pad-atom-md py-atom-md gap-atom-md (item) | external: none
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "danger";
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (key: string) => void;
  align?: "start" | "end";
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, align = "start", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>

      {open && (
        <div
          className={cn(
            "absolute top-full z-20 mt-atom min-w-48 rounded-xl border border-border bg-surface py-atom shadow-lg",
            align === "start" ? "end-0" : "start-0",
          )}
          role="menu"
        >
          {items.map((item) => (
            <div key={item.key}>
              {item.divider && <hr className="my-atom border-border" />}
              <button
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    onSelect(item.key);
                    setOpen(false);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-atom-md px-pad-atom-md py-atom-md text-right text-sm transition-colors",
                  "disabled:pointer-events-none disabled:opacity-50",
                  item.variant === "danger"
                    ? "text-danger hover:bg-red-50"
                    : "text-foreground hover:bg-surface-2",
                )}
              >
                {item.icon && (
                  <span className="shrink-0 text-current opacity-70">{item.icon}</span>
                )}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
