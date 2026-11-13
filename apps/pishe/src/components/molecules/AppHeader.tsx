/**
 * @level molecule
 * Island top bar: page title + breadcrumb path; optional save/status opposite title.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/atoms/BrandMark";
import type { AppCrumb } from "@/config/routes";
import type { HeaderStatusValue } from "@/providers/HeaderStatusProvider";
import { cn } from "@/lib/cn";

const statusToneClass: Record<
  NonNullable<HeaderStatusValue["tone"]>,
  string
> = {
  muted: "bg-surface-2 text-muted",
  success: "bg-primary/10 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  primary: "bg-primary/10 text-primary",
};

export function AppHeader({
  title,
  crumbs,
  brand = false,
  actions,
  trailing,
  status,
}: {
  title?: string;
  crumbs?: AppCrumb[];
  brand?: boolean;
  actions?: React.ReactNode;
  trailing?: React.ReactNode;
  status?: HeaderStatusValue | null;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const segments =
    crumbs && crumbs.length > 0
      ? crumbs
      : title
        ? [{ label: title }]
        : [];

  const pageTitle =
    segments.length > 0 ? segments[segments.length - 1]?.label : undefined;
  const parentCrumbs = segments.length > 1 ? segments.slice(0, -1) : [];
  const showBrandTitle = Boolean(brand && segments.length === 1 && !status);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 px-pad-mol transition-[padding] duration-200",
        compact ? "pt-pad-atom pb-pad-atom" : "pt-pad-mol pb-pad-atom-md",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-center justify-between gap-mol border border-border/80 bg-surface/95 backdrop-blur-md transition-all duration-200",
          "shadow-[0_8px_28px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.35)]",
          compact
            ? "rounded-2xl px-pad-mol py-pad-atom"
            : "rounded-3xl px-pad-mol-md py-pad-mol",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-atom-md">
          {brand ? (
            <BrandMark
              className={cn(
                "shrink-0 transition-all",
                compact ? "size-7" : "size-9",
              )}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-mol">
              {showBrandTitle ? (
                <p
                  className={cn(
                    "truncate font-bold text-primary transition-all",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {pageTitle}
                </p>
              ) : (
                <h1
                  className={cn(
                    "min-w-0 truncate font-semibold text-foreground transition-all",
                    compact ? "text-sm" : "text-base",
                  )}
                >
                  {pageTitle}
                </h1>
              )}

              {status?.label ? (
                <p
                  role="status"
                  className={cn(
                    "shrink-0 rounded-full px-pad-atom-md py-0.5 text-[11px] font-medium leading-tight transition-colors",
                    statusToneClass[status.tone ?? "muted"],
                  )}
                >
                  {status.label}
                </p>
              ) : null}
            </div>

            {parentCrumbs.length > 0 ? (
              <nav
                aria-label="Breadcrumb"
                className={cn(
                  "mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 text-muted transition-all",
                  compact ? "text-[10px]" : "text-xs",
                )}
              >
                {parentCrumbs.map((crumb, index) => (
                  <span
                    key={`${crumb.label}-${index}`}
                    className="inline-flex min-w-0 items-center gap-x-1"
                  >
                    {index > 0 ? (
                      <span className="shrink-0" aria-hidden>
                        /
                      </span>
                    ) : null}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="truncate transition-colors hover:text-foreground"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="truncate">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-atom-md">
          {actions}
          {trailing}
        </div>
      </div>
    </header>
  );
}
