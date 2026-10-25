/**
 * @level atom
 * @spacing internal: px-pad-atom-md|px-pad-mol|px-mol-md, gap-pad-atom|gap-atom-md | external: none
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-auth-accent text-white shadow-[0_12px_24px_rgba(63,94,251,0.22)] hover:bg-auth-accent-strong active:bg-auth-accent-strong focus-visible:ring-auth-accent/40",
  secondary:
    "bg-secondary text-white hover:bg-secondary-600 active:bg-secondary-700 focus-visible:ring-secondary-400",
  outline:
    "border border-auth-accent/35 text-auth-accent bg-white hover:bg-auth-accent-soft active:bg-auth-accent-soft focus-visible:ring-auth-accent/30",
  ghost:
    "bg-transparent text-foreground hover:bg-surface-2 active:bg-border focus-visible:ring-primary-400",
  danger:
    "bg-danger text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-pad-atom-md text-xs gap-pad-atom rounded-md",
  md: "h-11 px-pad-mol text-sm gap-atom-md rounded-lg",
  lg: "h-12 px-mol-md text-base gap-atom-md rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      startIcon,
      endIcon,
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
          "inline-flex items-center justify-center font-medium transition-[background-color,border-color,box-shadow,color]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <InlineSpinner size={size === "lg" ? "md" : "sm"} />
        ) : (
          startIcon
        )}
        {children}
        {!loading && endIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

function InlineSpinner({ size }: { size: "sm" | "md" }) {
  return (
    <svg
      className={cn("animate-spin", size === "sm" ? "size-3.5" : "size-4")}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
