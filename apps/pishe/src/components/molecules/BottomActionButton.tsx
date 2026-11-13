/**
 * @level molecule
 * Compact icon + small label control for the bottom action chrome.
 */
import { forwardRef, type ComponentType } from "react";
import { cn } from "@/lib/cn";

export type BottomActionVariant = "primary" | "outline" | "ghost" | "danger";

export interface BottomActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  variant?: BottomActionVariant;
  loading?: boolean;
}

const variants: Record<BottomActionVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-2",
  ghost: "bg-transparent text-foreground hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};

const BottomActionButton = forwardRef<
  HTMLButtonElement,
  BottomActionButtonProps
>(
  (
    {
      icon: Icon,
      label,
      variant = "primary",
      loading = false,
      disabled,
      className,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-pad-atom py-pad-atom text-[11px] font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
        ) : (
          <Icon className="size-5" aria-hidden />
        )}
        <span className="max-w-full truncate leading-tight">{label}</span>
      </button>
    );
  },
);

BottomActionButton.displayName = "BottomActionButton";

export { BottomActionButton };
