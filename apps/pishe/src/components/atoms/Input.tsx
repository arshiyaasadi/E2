/**
 * @level atom
 * @spacing internal: px-pad-mol | external: none
 */
"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** When set, renders a floating label inside the control. */
  label?: string;
  /** Trailing unit / hint inside the field (e.g. cm, g). */
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      invalid,
      type = "text",
      label,
      suffix,
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

    const controlClass = cn(
      "h-control w-full rounded-md border bg-surface px-pad-mol text-base text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary",
      "disabled:cursor-not-allowed disabled:opacity-50",
      suffix ? "pe-[4.5rem]" : "",
      invalid ? "border-danger" : "border-border",
    );

    if (!label) {
      return (
        <div className={cn("relative w-full", className)}>
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            defaultValue={defaultValue}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={onChange}
            className={cn(controlClass, "placeholder:text-muted")}
            {...props}
          />
          {suffix ? (
            <span className="pointer-events-none absolute end-pad-mol top-1/2 -translate-y-1/2 text-xs text-muted">
              {suffix}
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className={cn("relative w-full", className)}>
        <input
          ref={ref}
          id={inputId}
          type={type}
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
            controlClass,
            "peer placeholder:text-transparent",
            floated ? "pt-4 pb-1" : "",
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute start-pad-mol text-muted transition-all duration-200",
            floated
              ? "top-1.5 text-[11px] font-medium text-primary"
              : "top-1/2 -translate-y-1/2 text-sm",
          )}
        >
          {label}
        </label>
        {suffix ? (
          <span className="pointer-events-none absolute end-pad-mol top-1/2 -translate-y-1/2 text-xs text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
