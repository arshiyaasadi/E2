/**
 * @level atom
 * @spacing internal: gap-pad-atom (wrapper), px-pad-atom-md py-atom-md (input), ps/pe-pad-addon (icon offset) | external: none
 */
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { toLatinDigits } from "@/lib/validation/phone";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Icon at inline-start (right side in RTL) */
  startAddon?: React.ReactNode;
  /** Icon at inline-end (left side in RTL) */
  endAddon?: React.ReactNode;
  fullWidth?: boolean;
  /** Default rtl for Persian admin UI. Use ltr for email, slug, code. */
  textDirection?: "rtl" | "ltr" | "auto";
  /** Convert Persian/Arabic digits to Latin on change. Default true. */
  normalizeDigits?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      startAddon,
      endAddon,
      fullWidth = true,
      textDirection = "rtl",
      normalizeDigits = true,
      className,
      id,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = !!error;

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      if (!normalizeDigits || !onChange) {
        onChange?.(event);
        return;
      }

      const normalized = toLatinDigits(event.target.value);
      if (normalized === event.target.value) {
        onChange(event);
        return;
      }

      const nextEvent = {
        ...event,
        target: { ...event.target, value: normalized },
        currentTarget: { ...event.currentTarget, value: normalized },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(nextEvent);
    }

    return (
      <div className={cn("flex flex-col gap-pad-atom", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="ms-atom text-danger">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {startAddon && (
            <div className="pointer-events-none absolute start-pad-atom-md text-muted">
              {startAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            dir={textDirection}
            className={cn(
              "w-full rounded-lg border bg-white px-pad-atom-md py-atom-md text-sm text-foreground placeholder:text-muted shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
              "transition-[border-color,box-shadow,background-color] focus:border-auth-accent focus:bg-white focus:outline-none focus:ring-4 focus:ring-auth-accent/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
              hasError
                ? "border-danger focus:ring-red-400/40 focus:border-danger"
                : "border-auth-border hover:border-auth-accent/40",
              startAddon && "ps-pad-addon",
              endAddon && "pe-pad-addon",
              className,
            )}
            {...props}
            onChange={handleChange}
          />

          {endAddon && (
            <div className="pointer-events-none absolute end-pad-atom-md text-muted">
              {endAddon}
            </div>
          )}
        </div>

        {(hint || error) && (
          <p className={cn("text-xs", hasError ? "text-danger" : "text-muted")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
