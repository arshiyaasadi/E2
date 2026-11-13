"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Drawer } from "vaul";
import { LayoutGrid, List, Plus, SlidersHorizontal } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { useProductsQuery } from "@/features/products/queries";
import { formatTomanFromRial } from "@/features/products/money";
import { groupProducts, type TimeGroupKey } from "@/features/products/time-groups";
import type { ProductListItem, ProductStatus } from "@/features/products/types";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";
import { handleApiError } from "@/lib/api/client";

type ViewMode = "gallery" | "list";
type StatusFilter = "all" | ProductStatus;

function parseStatus(value: string | null): StatusFilter {
  if (value === "basic" || value === "complete") return value;
  return "all";
}

function parseView(value: string | null): ViewMode {
  return value === "list" ? "list" : "gallery";
}

function WizardMarketingCard() {
  const t = useTranslations("products.gallery");

  return (
    <Link
      href={ROUTES.productNew}
      className="flex flex-col gap-mol rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-accent/5 p-pad-mol-md shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-mol">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground">{t("wizardTitle")}</p>
          <p className="mt-atom text-sm leading-relaxed text-muted">
            {t("wizardBody")}
          </p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_20px_rgba(15,118,110,0.35)]">
          <Plus className="size-6" aria-hidden />
        </span>
      </div>

      <ol className="flex flex-col gap-atom-md rounded-xl border border-border/80 bg-surface/80 p-pad-mol text-sm">
        <li className="flex items-center gap-atom-md">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            1
          </span>
          <span className="text-foreground">{t("wizardStep1")}</span>
        </li>
        <li className="flex items-center gap-atom-md">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            2
          </span>
          <span className="text-foreground">{t("wizardStep2")}</span>
        </li>
      </ol>

      <span className="inline-flex h-control items-center justify-center rounded-xl bg-primary text-sm font-medium text-white shadow-sm">
        {t("wizardCta")}
      </span>
    </Link>
  );
}

function GalleryTile({ product }: { product: ProductListItem }) {
  const t = useTranslations("products.gallery");
  const tStatus = useTranslations("products.status");

  return (
    <Link
      href={ROUTES.product(product.id)}
      className="group relative aspect-square overflow-hidden rounded-2xl shadow-sm"
    >
      <div className="absolute inset-0 bg-surface-2">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-pad-atom-md pb-pad-atom-md pt-pad-mol">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-white">
          {product.title}
        </p>
      </div>
      <span
        className={cn(
          "absolute start-2 top-2 size-2.5 rounded-full shadow-sm",
          product.status === "complete" ? "bg-success" : "bg-warning",
        )}
        title={tStatus(product.status)}
      />
      {product.photoCount > 1 ? (
        <span className="absolute end-2 top-2 rounded-md bg-black/55 px-pad-atom text-[10px] text-white">
          {t("photoCount", { count: product.photoCount - 1 })}
        </span>
      ) : null}
    </Link>
  );
}

function ListRow({ product }: { product: ProductListItem }) {
  const tStatus = useTranslations("products.status");

  return (
    <Link
      href={ROUTES.product(product.id)}
      className="flex items-center gap-mol overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
    >
      <div className="relative size-20 shrink-0 bg-surface-2">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 py-pad-atom pe-pad-mol">
        <p className="truncate font-medium text-foreground">{product.title}</p>
        <p className="text-xs text-muted">
          {formatTomanFromRial(product.priceRial)} تومان
        </p>
        <span
          className={cn(
            "mt-atom inline-block rounded-full px-pad-atom text-[10px] font-medium",
            product.status === "complete"
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning",
          )}
        >
          {tStatus(product.status)}
        </span>
      </div>
    </Link>
  );
}

function GalleryInner() {
  const t = useTranslations("products.gallery");
  const query = useProductsQuery();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = parseStatus(searchParams.get("status"));
  const view = parseView(searchParams.get("view"));
  const q = searchParams.get("q") ?? "";
  const filtersOpen = searchParams.get("sheet") === "filters";

  const [draftStatus, setDraftStatus] = useState<StatusFilter>(status);
  const [searchDraft, setSearchDraft] = useState(q);

  const replaceParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setView = (next: ViewMode) => {
    replaceParams((p) => {
      if (next === "gallery") p.delete("view");
      else p.set("view", next);
    });
  };

  const openFilters = () => {
    setDraftStatus(status);
    replaceParams((p) => {
      p.set("sheet", "filters");
    });
  };

  const closeFilters = () => {
    replaceParams((p) => {
      p.delete("sheet");
    });
  };

  const applyFilters = () => {
    replaceParams((p) => {
      p.delete("sheet");
      if (draftStatus === "all") p.delete("status");
      else p.set("status", draftStatus);
    });
  };

  const clearFilters = () => {
    setDraftStatus("all");
    replaceParams((p) => {
      p.delete("sheet");
      p.delete("status");
    });
  };

  const commitSearch = (value: string) => {
    replaceParams((p) => {
      const trimmed = value.trim();
      if (!trimmed) p.delete("q");
      else p.set("q", trimmed);
    });
  };

  const products = query.data?.products ?? [];
  const total = products.length;
  const basicCount = products.filter((p) => p.status === "basic").length;
  const completeCount = products.filter((p) => p.status === "complete").length;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q.trim() && !p.title.includes(q.trim())) return false;
      return true;
    });
  }, [products, status, q]);

  const groups = useMemo(() => groupProducts(filtered), [filtered]);
  const hasProducts = total > 0;
  const filterActive = status !== "all";

  const groupLabel: Record<TimeGroupKey, string> = {
    thisWeek: t("groupThisWeek"),
    lastWeek: t("groupLastWeek"),
    thisMonth: t("groupThisMonth"),
    older: t("groupOlder"),
  };

  if (query.isLoading && !query.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!hasProducts) {
    return (
      <div className="flex flex-col gap-mol-md">
        {query.isError ? (
          <Alert variant="error">{handleApiError(query.error)}</Alert>
        ) : null}
        <WizardMarketingCard />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-mol-md">
      <div className="grid grid-cols-1 gap-atom-md sm:grid-cols-2">
        <Link
          href={ROUTES.productNew}
          className="rounded-2xl border border-border bg-surface p-pad-mol shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <p className="text-sm text-muted">{t("statProductsLabel")}</p>
          <p className="mt-atom text-3xl font-bold text-foreground">{total}</p>
          <p className="mt-atom-md flex items-center gap-atom text-xs font-medium text-primary">
            <Plus className="size-3.5" aria-hidden />
            {t("addViaCount")}
          </p>
        </Link>

        <div className="rounded-2xl border border-border bg-surface p-pad-mol shadow-sm">
          <p className="text-sm font-medium text-foreground">{t("nextStepTitle")}</p>
          <p className="mt-atom text-xs text-muted">{t("nextStepHint")}</p>
          <div className="mt-mol flex items-stretch">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-xs text-muted">{t("nextStepBasic")}</p>
              <p className="mt-atom text-2xl font-bold text-warning">{basicCount}</p>
            </div>
            <div className="mx-pad-atom w-px self-stretch bg-border" aria-hidden />
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="text-xs text-muted">{t("nextStepComplete")}</p>
              <p className="mt-atom text-2xl font-bold text-success">{completeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {query.isError ? (
        <Alert variant="error">{handleApiError(query.error)}</Alert>
      ) : null}

      <div className="flex items-center gap-atom-md">
        <div className="min-w-0 flex-1">
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onBlur={() => commitSearch(searchDraft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                commitSearch(searchDraft);
              }
            }}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <button
          type="button"
          aria-label={t("filterOpen")}
          onClick={openFilters}
          className={cn(
            "relative inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-sm",
            "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            filterActive && "border-primary text-primary",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {filterActive ? (
            <span className="absolute end-2 top-2 size-2 rounded-full bg-primary" />
          ) : null}
        </button>
        <div className="flex h-12 shrink-0 items-center rounded-2xl border border-border bg-surface p-0.5 shadow-sm">
          <button
            type="button"
            aria-label={t("viewGallery")}
            onClick={() => setView("gallery")}
            className={cn(
              "flex size-11 items-center justify-center rounded-[0.875rem] transition-colors",
              view === "gallery"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-2",
            )}
          >
            <LayoutGrid className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t("viewList")}
            onClick={() => setView("list")}
            className={cn(
              "flex size-11 items-center justify-center rounded-[0.875rem] transition-colors",
              view === "list"
                ? "bg-primary text-white"
                : "text-muted hover:bg-surface-2",
            )}
          >
            <List className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-muted">{t("yourProducts")}</h2>

      {groups.length === 0 ? (
        <p className="text-center text-muted">{t("empty")}</p>
      ) : view === "gallery" ? (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-mol">
            <h3 className="text-sm font-semibold text-muted">
              {groupLabel[group.key]}
            </h3>
            <div className="grid grid-cols-3 gap-atom-md">
              {group.items.map((product) => (
                <GalleryTile key={product.id} product={product} />
              ))}
            </div>
          </section>
        ))
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-atom-md">
            <h3 className="text-sm font-semibold text-muted">
              {groupLabel[group.key]}
            </h3>
            {group.items.map((product) => (
              <ListRow key={product.id} product={product} />
            ))}
          </section>
        ))
      )}

      <Drawer.Root
        open={filtersOpen}
        onOpenChange={(open) => {
          if (!open) closeFilters();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-surface outline-none shadow-[0_-12px_40px_rgba(15,23,42,0.18)]">
            <div className="mx-auto mt-pad-atom-md h-1.5 w-12 shrink-0 rounded-full bg-border" />
            <Drawer.Title className="px-pad-mol-md pt-pad-atom-md text-center text-sm font-semibold text-foreground">
              {t("filterTitle")}
            </Drawer.Title>
            <div className="flex flex-col gap-mol overflow-y-auto px-pad-mol-md pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-pad-mol">
              <p className="text-sm font-medium text-foreground">
                {t("filterStatus")}
              </p>
              <div className="flex flex-col gap-atom-md">
                {(
                  [
                    ["all", t("filterAll")],
                    ["basic", t("filterBasic")],
                    ["complete", t("filterComplete")],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDraftStatus(key)}
                    className={cn(
                      "rounded-2xl border px-pad-mol py-pad-atom-md text-start text-sm transition-colors",
                      draftStatus === key
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border bg-surface text-foreground hover:bg-surface-2",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-atom-md pt-pad-atom">
                <Button fullWidth onClick={applyFilters}>
                  {t("filterApply")}
                </Button>
                <Button variant="outline" fullWidth onClick={clearFilters}>
                  {t("filterClear")}
                </Button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

export function GalleryContent() {
  const t = useTranslations("products.gallery");

  return (
    <AppTemplate title={t("title")}>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <GalleryInner />
      </Suspense>
    </AppTemplate>
  );
}
