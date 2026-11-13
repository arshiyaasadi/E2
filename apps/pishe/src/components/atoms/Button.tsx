/**
 * @level atom
 * @spacing internal: px-pad-atom-md|px-pad-mol, gap-atom-md | external: none
 */
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/40 shadow-sm",
  secondary:
    "bg-secondary text-white hover:opacity-90 focus-visible:ring-secondary/40",
  accent:
    "bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent/40",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-2 focus-visible:ring-primary/30",
  ghost:
    "bg-transparent text-foreground hover:bg-surface-2 focus-visible:ring-primary/30",
  danger:
    "bg-danger text-white hover:opacity-90 focus-visible:ring-danger/40",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-control-sm px-pad-atom-md text-sm gap-atom rounded-md",
  md: "h-control px-pad-mol text-base gap-atom-md rounded-md",
  lg: "h-control-lg px-pad-mol-md text-base gap-atom-md rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? <InlineSpinner /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

function InlineSpinner() {
  return (
    <svg
      className="me-2 size-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export { Button };
