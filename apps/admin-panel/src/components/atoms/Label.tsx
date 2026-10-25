/**
 * @level atom
 * @spacing internal: gap-pad-atom-xs (label + hint stack), mr-atom (required asterisk) | external: none
 */
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  hint?: string;
}

export function Label({ required, hint, className, children, ...props }: LabelProps) {
  return (
    <div className="flex flex-col gap-pad-atom-xs">
      <label
        className={cn("text-sm font-medium text-foreground", className)}
        {...props}
      >
        {children}
        {required && <span className="mr-atom text-danger">*</span>}
      </label>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
