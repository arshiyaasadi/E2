/**
 * @level atom
 * @spacing internal: p-pad-mol | external: none
 */
"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** When set, renders a floating label inside the control. */
  label?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      invalid,
      label,
      id,
      value,
      defaultValue,
      onFocus,
      onBlur,
      onChange,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [focused, setFocused] = useState(false);
    const [uncontrolledHasValue, setUncontrolledHasValue] = useState(
      Boolean(defaultValue),
    );

    const isControlled = value !== undefined;
    const hasValue = isControlled
      ? String(value).length > 0
      : uncontrolledHasValue;
    const floated = Boolean(label) && (focused || hasValue);

    if (!label) {
      return (
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={onChange}
          className={cn(
            "min-h-28 w-full rounded-md border bg-surface px-pad-mol py-pad-atom-md text-base text-foreground",
            "placeholder:text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <div className={cn("relative w-full", className)}>
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          placeholder={floated ? placeholder : " "}
          aria-invalid={invalid || undefined}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onChange={(e) => {
            if (!isControlled) {
              setUncontrolledHasValue(e.target.value.length > 0);
            }
            onChange?.(e);
          }}
          className={cn(
            "peer min-h-28 w-full rounded-md border bg-surface px-pad-mol pb-pad-atom-md text-base text-foreground",
            "placeholder:text-transparent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            floated ? "pt-5" : "pt-pad-atom-md",
            invalid ? "border-danger" : "border-border",
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute start-pad-mol text-muted transition-all duration-200",
            floated
              ? "top-1.5 text-[11px] font-medium text-primary"
              : "top-pad-atom-md text-sm",
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
