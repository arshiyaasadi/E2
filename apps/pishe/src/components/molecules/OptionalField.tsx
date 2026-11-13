/**
 * @level molecule
 * Expandable optional form fields (chip → panel), shared by product/brand/category.
 */
import { Plus, X } from "lucide-react";

export function OptionalFieldChip({
  label,
  onOpen,
}: {
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-atom rounded-lg px-pad-atom py-0.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <Plus className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

export function OptionalFieldPanel({
  label,
  closeLabel,
  onClose,
  children,
}: {
  label: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-atom">
      <div className="flex items-center justify-between gap-mol">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-0.5 text-muted hover:bg-surface-2 hover:text-foreground"
          aria-label={closeLabel}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
      {children}
    </div>
  );
}
