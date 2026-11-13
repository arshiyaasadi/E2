"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { ProductCard } from "@/features/products/components/ProductCard";
import { useProductsQuery } from "@/features/products/queries";
import { formatGroupedNumber } from "@/features/products/money";
import { useMeQuery } from "@/features/auth/queries";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { ROUTES } from "@/config/routes";
import { useAuthStore } from "@/store/slices/auth.slice";
import { handleApiError } from "@/lib/api/client";

export function DashboardContent() {
  const t = useTranslations("products.dashboard");
  const router = useRouter();
  const { isLoading: meLoading } = useMeQuery();
  const user = useAuthStore((s) => s.user);
  const productsQuery = useProductsQuery();

  if ((meLoading && !user) || (productsQuery.isLoading && !productsQuery.data)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const products = productsQuery.data?.products ?? [];
  const stats = productsQuery.data?.stats;
  const latest = products.slice(0, 6);
  const hasItems = products.length > 0;

  return (
    <AppTemplate title={t("title")} brand>
      {hasItems ? (
        <BottomActions>
          <BottomActionButton
            icon={Plus}
            label={t("addProduct")}
            onClick={() => router.push(ROUTES.productNew)}
          />
        </BottomActions>
      ) : null}

      <div className="flex flex-col gap-org">
        <div className="flex flex-col gap-atom">
          <h2 className="text-xl font-semibold text-foreground">
            {t("greeting", { name: user?.displayName ?? "" })}
          </h2>
          {stats ? (
            <p className="text-sm text-muted">
              {t("statTotal", { count: formatGroupedNumber(stats.total) })}
              {" · "}
              {t("statBasic", { count: formatGroupedNumber(stats.basicCount) })}
              {stats.averagePriceToman !== null
                ? ` · ${t("statAvg", {
                    price: formatGroupedNumber(stats.averagePriceToman),
                  })}`
                : null}
            </p>
          ) : productsQuery.isError ? (
            <p className="text-sm text-muted">{t("statsUnavailable")}</p>
          ) : null}
        </div>

        {productsQuery.isError ? (
          <Alert variant="error">{handleApiError(productsQuery.error)}</Alert>
        ) : null}

        {!hasItems ? (
          <EmptyState
            title={t("emptyTitle")}
            body={t("emptyBody")}
            action={
              <Button
                variant="outline"
                onClick={() => router.push(ROUTES.productNew)}
              >
                <Plus className="size-4" aria-hidden />
                {t("addProduct")}
              </Button>
            }
          />
        ) : (
          <section className="flex flex-col gap-mol">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t("latest")}</h3>
              <Link href={ROUTES.productsList} className="text-sm text-primary">
                {t("viewAll")}
              </Link>
            </div>
            <div className="flex gap-mol overflow-x-auto pb-pad-atom">
              {latest.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppTemplate>
  );
}
