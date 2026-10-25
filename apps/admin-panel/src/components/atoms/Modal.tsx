/**
 * @level atom
 * @spacing internal: p-pad-mol (container), px-mol-md py-pad-mol (header/body/footer), gap-pad-atom-md (footer), p-atom (close btn) | external: none
 */
"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

const sizes: Record<ModalSize, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-2xl",
  full: "max-w-screen-lg",
};

const subscribeNoop = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  children,
  className,
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(subscribeNoop, getClientMounted, getServerMounted);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center overflow-y-auto p-pad-mol"
      dir="rtl"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 my-auto w-full max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-surface shadow-lg",
          sizes[size],
          className,
        )}
      >
        {/* Header */}
        {title != null && title !== "" && (
          <div className="flex items-start justify-between gap-pad-atom-md border-b border-border px-mol-md py-pad-mol">
            <div id="modal-title" className="min-w-0 flex-1 text-base font-semibold text-foreground">
              {typeof title === "string" ? <h2 className="text-base font-semibold">{title}</h2> : title}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-atom text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="بستن"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const classNames = typeof className === "string" ? className : "";
  const hasExplicitPadding = /\b(p-0|px-0|py-0|p-pad-|px-|py-)\b/.test(classNames);

  return (
    <div
      className={cn(!hasExplicitPadding && "px-mol-md py-pad-mol", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-pad-atom-md border-t border-border px-mol-md py-pad-mol",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
