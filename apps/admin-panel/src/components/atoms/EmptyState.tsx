/**
 * @level atom
 * @spacing internal: gap-pad-atom-md (outer stack), p-pad-mol (icon wrapper), gap-atom (title/desc stack) | external: none
 */
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-pad-atom-md py-pad-org text-center",
        className,
      )}
    >
      {icon && (
        <div className="rounded-full bg-surface-2 p-pad-mol text-muted">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-atom">
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-xs text-sm text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
