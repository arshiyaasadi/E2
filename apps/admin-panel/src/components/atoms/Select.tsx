/**
 * @level atom
 * @spacing internal: gap-pad-atom (wrapper), px-pad-atom-md py-atom-md ps-pad-mol-md (select), start-pad-atom-md (chevron) | external: none
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, placeholder, fullWidth = true, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = !!error;

    return (
      <div className={cn("flex flex-col gap-pad-atom", fullWidth && "w-full")}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="mr-atom text-danger">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full appearance-none rounded-md border bg-surface px-pad-atom-md py-atom-md text-sm text-foreground",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              hasError
                ? "border-danger focus:ring-red-400"
                : "border-border hover:border-primary-300",
              // Padding end reserves space for chevron icon (RTL: left side)
              "pe-pad-addon",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron — positioned on end side (left in RTL) */}
          <div className="pointer-events-none absolute inset-y-0 end-pad-atom-md flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4 text-muted"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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

Select.displayName = "Select";

export { Select };
