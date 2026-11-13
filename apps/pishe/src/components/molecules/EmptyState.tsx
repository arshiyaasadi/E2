/**
 * @level molecule
 * Prominent empty section: title, short explanation, optional outline CTA.
 * Use for any list/feature with no items so future screens stay consistent.
 */
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  action,
  icon,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-mol rounded-2xl border border-dashed border-border bg-surface px-pad-mol py-pad-org text-center shadow-sm",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-muted">
          {icon}
        </span>
      ) : null}
      <div className="flex max-w-sm flex-col gap-atom">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {body ? <p className="text-sm leading-relaxed text-muted">{body}</p> : null}
      </div>
      {action ? <div className="mt-atom">{action}</div> : null}
    </div>
  );
}
