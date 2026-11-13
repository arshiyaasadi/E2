/**
 * @level atom
 * @spacing internal: p-pad-mol gap-atom-md | external: none
 */
import { cn } from "@/lib/cn";

export type AlertVariant = "error" | "success" | "info" | "warning";

const variants: Record<AlertVariant, string> = {
  error: "border-danger/30 bg-danger/10 text-danger",
  success: "border-success/30 bg-success/10 text-success",
  info: "border-info/30 bg-info/10 text-info",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function Alert({
  variant = "info",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-pad-mol py-pad-atom-md text-sm",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
