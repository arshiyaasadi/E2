/**
 * @level molecule
 * Unified bottom chrome: optional page actions + nav island.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderTree, LayoutGrid, ShoppingBag } from "lucide-react";
import { BrandMark } from "@/components/atoms/BrandMark";
import { useBottomActionsSlot } from "@/providers/BottomActionsProvider";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/config/routes";

export function BottomNav() {
  const t = useTranslations("products.nav");
  const pathname = usePathname();
  const { setSlotEl, hasActions } = useBottomActionsSlot();

  const items = [
    {
      key: "home",
      href: ROUTES.home,
      label: t("home"),
      brand: true as const,
      active: pathname === ROUTES.home,
    },
    {
      key: "products",
      href: ROUTES.products,
      label: t("products"),
      icon: LayoutGrid,
      active: pathname.startsWith("/products"),
    },
    {
      key: "categories",
      href: "#",
      label: t("categories"),
      icon: FolderTree,
      active: false,
      disabled: true as const,
    },
    {
      key: "orders",
      href: "#",
      label: t("orders"),
      icon: ShoppingBag,
      active: false,
      disabled: true as const,
    },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] px-pad-mol pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/95 backdrop-blur-md",
          "shadow-[0_10px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_10px_32px_rgba(0,0,0,0.4)]",
          "transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      >
        <div
          ref={setSlotEl}
          className={cn(
            "flex w-full items-stretch gap-atom-md px-pad-atom-md",
            hasActions
              ? "animate-fade-rise pt-pad-atom-md pb-pad-atom"
              : "hidden",
          )}
        />

        {hasActions ? (
          <div className="mx-pad-atom-md h-px bg-border" aria-hidden />
        ) : null}

        <div
          className={cn(
            "flex items-end justify-around gap-atom px-pad-atom",
            hasActions ? "pb-pad-atom pt-pad-atom" : "py-pad-atom",
          )}
        >
          {items.map((item) => {
            if (item.key === "home") {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-label={item.label}
                  className={cn(
                    "flex flex-1 flex-col items-center rounded-xl transition-colors",
                    hasActions ? "py-pad-atom" : "gap-atom py-pad-atom text-[11px]",
                    item.active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted hover:text-foreground",
                  )}
                >
                  <BrandMark className="size-5" />
                  {!hasActions ? item.label : null}
                </Link>
              );
            }

            if (item.key === "categories" || item.key === "orders") {
              const Icon = item.icon!;
              return (
                <span
                  key={item.key}
                  aria-label={item.label}
                  className={cn(
                    "flex flex-1 flex-col items-center text-muted opacity-45",
                    hasActions ? "py-pad-atom" : "gap-atom py-pad-atom text-[11px]",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {!hasActions ? item.label : null}
                </span>
              );
            }

            const Icon = item.icon!;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={item.label}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-xl transition-colors",
                  hasActions ? "py-pad-atom" : "gap-atom py-pad-atom text-[11px]",
                  item.active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {!hasActions ? item.label : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
