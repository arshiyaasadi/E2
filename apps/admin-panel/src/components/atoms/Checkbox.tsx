/**
 * @level atom
 * @spacing internal: gap-atom (wrapper), gap-atom-md (label), mt-pad-atom-xs (input), pe-mol-md (hint) | external: none
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const checkId = id ?? `checkbox-${label?.toLowerCase().replace(/\s+/g, "-")}`;
    const hasError = !!error;

    return (
      <div className="flex flex-col gap-atom">
        <label htmlFor={checkId} className="flex cursor-pointer items-start gap-atom-md">
          <input
            ref={ref}
            id={checkId}
            type="checkbox"
            className={cn(
              "mt-pad-atom-xs size-4 shrink-0 cursor-pointer rounded border-border",
              "accent-primary transition-colors",
              "disabled:cursor-not-allowed disabled:opacity-50",
              hasError && "border-danger",
              className,
            )}
            {...props}
          />
          {label && (
            <span className="text-sm text-foreground leading-tight">{label}</span>
          )}
        </label>
        {(hint || error) && (
          <p className={cn("text-xs pe-mol-md", hasError ? "text-danger" : "text-muted")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
