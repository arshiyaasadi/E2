/**
 * @level atom
 * @spacing internal: p-pad-mol|p-mol-md|p-pad-mol-md (padding variants), mb-pad-mol (header), mt-pad-mol pt-pad-mol (footer) | external: none
 */
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: boolean;
  border?: boolean;
  variant?: "solid" | "glass";
}

const paddings = {
  none: "",
  sm: "p-pad-mol",
  md: "p-mol-md",
  lg: "p-mol-lg",
};

export function Card({
  padding = "md",
  shadow = true,
  border = true,
  variant = "glass",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variant === "glass" ? "glass-panel" : "bg-surface",
        variant === "solid" && border && "border border-border",
        variant === "glass" && border && "border-white/50",
        shadow && variant === "solid" && "shadow-sm",
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-pad-mol flex items-center justify-between gap-pad-atom-md", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm text-foreground", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-pad-mol flex items-center justify-between gap-pad-atom-md border-t border-border/60 pt-pad-mol",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
