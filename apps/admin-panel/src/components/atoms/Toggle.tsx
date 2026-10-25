/**
 * @level atom
 * @spacing internal: gap-pad-atom-md (label), gap-pad-atom-xs (label/hint stack) | external: none
 */
"use client";

import { cn } from "@/lib/utils";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const sizes = {
  sm: {
    track: "h-5 w-9",
    thumb: "size-3.5",
    translate: "translate-x-4",
  },
  md: {
    track: "h-6 w-11",
    thumb: "size-4",
    translate: "translate-x-5",
  },
};

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  size = "md",
  className,
}: ToggleProps) {
  const s = sizes[size];

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-pad-atom-md",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {/* Track */}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        type="button"
        className={cn(
          "relative shrink-0 rounded-full transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2",
          s.track,
          checked ? "bg-primary" : "bg-gray-300",
        )}
      >
        {/* Thumb — RTL: starts from right side */}
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform",
            s.thumb,
            checked
              ? "end-0.5 -translate-x-0"
              : "start-0.5",
          )}
        />
      </button>

      {(label || hint) && (
        <div className="flex flex-col gap-pad-atom-xs">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {hint && <span className="text-xs text-muted">{hint}</span>}
        </div>
      )}
    </label>
  );
}
