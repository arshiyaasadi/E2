/**
 * @level molecule
 * @spacing internal: gap-atom | external: none
 */
"use client";

import { X } from "lucide-react";
import { Button } from "@/components/atoms/Button";

export function HelpDialog({
  open,
  title,
  children,
  closeLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-pad-mol sm:items-center">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="help-dialog-title"
        className="relative z-10 flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-between gap-mol border-b border-border px-pad-mol py-pad-mol">
          <h2
            id="help-dialog-title"
            className="text-sm font-semibold text-foreground"
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="overflow-y-auto px-pad-mol py-pad-mol text-sm leading-relaxed text-muted">
          {children}
        </div>
      </div>
    </div>
  );
}
