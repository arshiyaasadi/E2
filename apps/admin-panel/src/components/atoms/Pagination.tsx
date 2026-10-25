/**
 * @level atom
 * @spacing internal: gap-atom (page buttons) | external: none
 */
"use client";

import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, limit, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="صفحه‌بندی"
      className={cn("flex items-center justify-center gap-atom", className)}
    >
      {/* Previous — RTL: arrow points left which is "next" in RTL page order */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted",
          "hover:bg-surface-2 hover:text-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-40",
        )}
        aria-label="صفحه بعد"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="inline-flex size-9 items-center justify-center text-muted">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              p === page
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-surface-2",
            )}
          >
            {p}
          </button>
        ),
      )}

      {/* Next */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted",
          "hover:bg-surface-2 hover:text-foreground transition-colors",
          "disabled:pointer-events-none disabled:opacity-40",
        )}
        aria-label="صفحه قبل"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
        </svg>
      </button>
    </nav>
  );
}
