/**
 * @level atom
 * @spacing internal: px-atom-md|px-pad-atom-md, py-pad-atom-xs|py-atom, gap-pad-atom | external: none
 */
import { cn } from "@/lib/utils";

export type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variants: Record<BadgeVariant, string> = {
  primary:   "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  success:   "bg-green-100 text-green-700",
  warning:   "bg-amber-100 text-amber-700",
  danger:    "bg-red-100 text-red-700",
  neutral:   "bg-gray-100 text-gray-700",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-atom-md py-pad-atom-xs text-xs",
  md: "px-pad-atom-md py-atom text-sm",
};

export function Badge({
  variant = "primary",
  size = "sm",
  dot = false,
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-pad-atom rounded-full font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {dot && (
        <span className="block size-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
