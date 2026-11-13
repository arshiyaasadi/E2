/**
 * @level molecule
 * @spacing internal: gap-atom | p-pad-mol | external: none
 * Reusable form card with a consistent title / help header.
 */
import { Label } from "@/components/atoms/Label";
import { cn } from "@/lib/cn";

export function FormSection({
  title,
  titleHtmlFor,
  required,
  help,
  description,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  titleHtmlFor?: string;
  required?: boolean;
  help?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const hasHeader = Boolean(title) || Boolean(help);

  return (
    <section
      className={cn(
        "flex flex-col gap-atom rounded-2xl border border-border bg-surface p-pad-mol shadow-sm",
        className,
      )}
    >
      {hasHeader ? (
        <div className="flex flex-col gap-atom">
          <div className="flex items-center justify-between gap-mol">
            {title ? (
              <Label htmlFor={titleHtmlFor} className="min-w-0 flex-1">
                {required ? (
                  <span className="me-atom text-danger" aria-hidden>
                    *
                  </span>
                ) : null}
                {title}
              </Label>
            ) : (
              <span className="min-w-0 flex-1" />
            )}
            {help ? <div className="shrink-0">{help}</div> : null}
          </div>
          {description ? (
            <p className="text-sm text-muted">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-atom", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
