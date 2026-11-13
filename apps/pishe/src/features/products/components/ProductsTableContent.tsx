"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { useProductsQuery } from "@/features/products/queries";
import { formatTomanFromRial } from "@/features/products/money";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { formatJalaliDate } from "@/lib/datetime/jalali";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 12;

export function ProductsTableContent() {
  const t = useTranslations("products");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const tStatus = useTranslations("products.status");
  const router = useRouter();
  const query = useProductsQuery();
  const [page, setPage] = useState(1);

  const products = query.data?.products ?? [];
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, safePage]);

  const hasItems = products.length > 0;

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: tHub("listTitle") },
      ]}
      denseMain
    >
      {hasItems ? (
        <BottomActions>
          <BottomActionButton
            icon={Plus}
            label={t("dashboard.addProduct")}
            onClick={() => router.push(ROUTES.productNew)}
          />
        </BottomActions>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : !hasItems ? (
        <EmptyState
          title={t("gallery.empty")}
          body={t("gallery.emptyBody")}
          action={
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.productNew)}
            >
              <Plus className="size-4" aria-hidden />
              {t("dashboard.addProduct")}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/70 text-start text-xs text-muted">
                  <th className="px-pad-mol py-pad-atom-md font-medium">
                    {t("table.photo")}
                  </th>
                  <th className="px-pad-mol py-pad-atom-md font-medium">
                    {t("table.title")}
                  </th>
                  <th className="px-pad-mol py-pad-atom-md font-medium">
                    {t("table.status")}
                  </th>
                  <th className="px-pad-mol py-pad-atom-md font-medium">
                    {t("table.price")}
                  </th>
                  <th className="px-pad-mol py-pad-atom-md font-medium">
                    {t("table.updated")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => (
                  <tr
                    key={product.id}
                    className="cursor-pointer border-b border-border/70 last:border-b-0 transition-colors hover:bg-surface-2/50"
                    onClick={() => router.push(ROUTES.product(product.id))}
                  >
                    <td className="px-pad-mol py-pad-atom-md">
                      <div className="size-11 overflow-hidden rounded-xl border border-border bg-surface-2">
                        {product.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.coverUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[10rem] truncate px-pad-mol py-pad-atom-md font-medium text-foreground">
                      {product.title}
                    </td>
                    <td className="px-pad-mol py-pad-atom-md">
                      <span
                        className={cn(
                          "rounded-full px-pad-atom py-0.5 text-[11px]",
                          product.status === "complete"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/15 text-foreground",
                        )}
                      >
                        {tStatus(product.status)}
                      </span>
                    </td>
                    <td className="px-pad-mol py-pad-atom-md tabular-nums text-muted">
                      {formatTomanFromRial(product.priceRial)}
                    </td>
                    <td className="px-pad-mol py-pad-atom-md text-muted">
                      {formatJalaliDate(product.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-mol border-t border-border px-pad-mol py-pad-atom-md">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight className="size-4" aria-hidden />
                {t("table.prev")}
              </Button>
              <p className="text-xs text-muted">
                {t("table.page", { current: safePage, total: totalPages })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("table.next")}
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <p className="mt-mol text-center text-xs text-muted">
        <Link href={ROUTES.products} className="text-primary">
          {t("hub.backToHub")}
        </Link>
      </p>
    </AppTemplate>
  );
}
