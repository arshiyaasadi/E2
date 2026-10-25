"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components/atoms";
import { StatCard } from "@/components/molecules/StatCard";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { useAdminOverview } from "@/features/admin/queries";

export function AdminOverviewStats() {
  const t = useTranslations("admin");
  const { data, isLoading, isError } = useAdminOverview();

  return (
    <AdminPageShell title={t("overview.title")}>
      {isLoading ? (
        <div className="flex items-center justify-center py-mol-lg">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-danger">{t("overview.error")}</p>
      ) : (
        <div className="grid gap-mol md:grid-cols-3">
          <StatCard label={t("overview.products")} value={data.productsCount} />
          <StatCard label={t("overview.orders")} value={data.ordersCount} />
          <StatCard label={t("overview.customers")} value={data.customersCount} />
        </div>
      )}
    </AdminPageShell>
  );
}
