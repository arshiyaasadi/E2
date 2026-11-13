/**
 * @level atom
 * @spacing internal: gap-atom-md | external: none
 */
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className={cn("inline-flex items-center gap-atom-md text-sm", className)}>
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="size-4 rounded border-border text-primary focus-visible:ring-primary/40"
          {...props}
        />
        {label ? <span className="text-foreground">{label}</span> : null}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
