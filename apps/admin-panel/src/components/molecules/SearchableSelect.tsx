"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toLatinDigits } from "@/lib/validation/phone";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function SearchableSelect({
  label,
  placeholder = "انتخاب کنید",
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  error,
}: SearchableSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  useEffect(() => {
    if (value) setQuery(selectedLabel);
    else setQuery("");
  }, [value, selectedLabel]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q || q === selectedLabel) return options;
    return options.filter((o) => o.label.includes(q));
  }, [options, query, selectedLabel]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedLabel);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [selectedLabel]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full flex-col gap-pad-atom",
        open && !disabled && "z-[1100]",
      )}
    >
      {label ? (
        <label className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ms-atom text-danger">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={listId}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setQuery(toLatinDigits(e.target.value));
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => !disabled && setOpen(true)}
          className={cn(
            "w-full rounded-xl border bg-surface/80 px-pad-atom-md py-atom-md pe-pad-addon text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary",
            disabled && "cursor-not-allowed opacity-50",
            error ? "border-danger" : "border-border/80",
          )}
        />
        <ChevronDown className="pointer-events-none absolute end-pad-atom-md top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>

      {open && !disabled ? (
        <ul className="absolute inset-x-0 top-full z-[1100] mt-atom-sm max-h-48 overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-pad-atom-md py-atom-md text-sm text-muted">موردی یافت نشد</li>
          ) : (
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-pad-atom-md py-atom-md text-start text-sm transition-colors hover:bg-surface-2",
                    option.value === value && "bg-primary-50 text-primary font-medium",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
