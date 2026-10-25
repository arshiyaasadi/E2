"use client";

import { useTranslations } from "next-intl";
import { Alert, Badge, Card, EmptyState, Spinner } from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { StatCard } from "@/components/molecules/StatCard";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { useReportsDashboard } from "@/features/reports/queries";
import { useOrderStatuses } from "@/features/project/queries";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";

function formatMoney(value: number) {
  return `${value.toLocaleString("fa-IR")} ریال`;
}

export function AdminReportsPanel({
  variant = "reports",
}: {
  variant?: "dashboard" | "reports";
}) {
  const t = useTranslations("admin.reports");
  const tOverview = useTranslations("admin.overview");
  const user = useAuthUser();
  const canView =
    variant === "dashboard" || hasPermission(user.permissions, "reports.view", user.role);
  const { data, isLoading, isError } = useReportsDashboard();
  const { data: statusDefs } = useOrderStatuses();

  const statusLabels = new Map(statusDefs?.map((def) => [def.code, def.labelFa]) ?? []);
  const title = variant === "dashboard" ? tOverview("title") : t("title");
  const description = variant === "dashboard" ? tOverview("subtitle") : t("subtitle");

  if (!canView) {
    return (
      <AdminPageShell title={title} description={description}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={title} description={description}>
      {isLoading ? (
        <div className="flex justify-center py-org">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <Alert variant="danger">{t("error")}</Alert>
      ) : (
        <div className="grid gap-mol-md">
          <section>
            <h2 className="mb-mol text-base font-semibold">{t("sections.revenue")}</h2>
            <div className="grid gap-mol sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("metrics.totalRevenue")} value={formatMoney(data.summary.totalRevenue)} />
              <StatCard
                label={t("metrics.revenueThisMonth")}
                value={formatMoney(data.summary.revenueThisMonth)}
              />
              <StatCard
                label={t("metrics.averageOrderValue")}
                value={formatMoney(data.summary.averageOrderValue)}
              />
              <StatCard label={t("metrics.paidOrders")} value={data.summary.paidOrdersCount} />
            </div>
          </section>

          <section>
            <h2 className="mb-mol text-base font-semibold">{t("sections.orders")}</h2>
            <div className="grid gap-mol sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("metrics.ordersToday")} value={data.summary.ordersToday} />
              <StatCard label={t("metrics.ordersThisWeek")} value={data.summary.ordersThisWeek} />
              <StatCard label={t("metrics.ordersThisMonth")} value={data.summary.ordersThisMonth} />
              <StatCard label={t("metrics.pendingOrders")} value={data.summary.pendingOrders} />
            </div>
          </section>

          <section>
            <h2 className="mb-mol text-base font-semibold">{t("sections.store")}</h2>
            <div className="grid gap-mol sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("metrics.activeProducts")} value={data.summary.activeProducts} />
              <StatCard label={t("metrics.activeCustomers")} value={data.summary.activeCustomers} />
              <StatCard
                label={t("metrics.newCustomersThisMonth")}
                value={data.summary.newCustomersThisMonth}
              />
              <StatCard label={t("metrics.activeCoupons")} value={data.couponStats.activeCoupons} />
            </div>
          </section>

          <div className="grid gap-mol-lg xl:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="border-b px-mol py-pad-mol">
                <h3 className="font-semibold">{t("sections.ordersByStatus")}</h3>
              </div>
              {data.ordersByStatus.length === 0 ? (
                <EmptyState title={t("emptyOrders")} />
              ) : (
                <Table>
                  <TableHead>
                    <Tr>
                      <Th>{t("columns.status")}</Th>
                      <Th>{t("columns.count")}</Th>
                      <Th>{t("columns.revenue")}</Th>
                    </Tr>
                  </TableHead>
                  <TableBody>
                    {data.ordersByStatus.map((row) => (
                      <Tr key={row.status}>
                        <Td>
                          <Badge variant="neutral">
                            {statusLabels.get(row.status) ?? row.status}
                          </Badge>
                        </Td>
                        <Td>{row.count}</Td>
                        <Td>{formatMoney(row.revenue)}</Td>
                      </Tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="border-b px-mol py-pad-mol">
                <h3 className="font-semibold">{t("sections.topProducts")}</h3>
              </div>
              {data.topProducts.length === 0 ? (
                <EmptyState title={t("emptyProducts")} />
              ) : (
                <Table>
                  <TableHead>
                    <Tr>
                      <Th>{t("columns.product")}</Th>
                      <Th>{t("columns.quantity")}</Th>
                      <Th>{t("columns.revenue")}</Th>
                    </Tr>
                  </TableHead>
                  <TableBody>
                    {data.topProducts.map((row) => (
                      <Tr key={`${row.productTitle}-${row.variantSku}`}>
                        <Td>
                          <div>{row.productTitle}</div>
                          <div className="text-xs text-muted-foreground">{row.variantSku}</div>
                        </Td>
                        <Td>{row.quantitySold}</Td>
                        <Td>{formatMoney(row.revenue)}</Td>
                      </Tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b px-mol py-pad-mol">
              <h3 className="font-semibold">{t("sections.recentOrders")}</h3>
            </div>
            {data.recentOrders.length === 0 ? (
              <EmptyState title={t("emptyOrders")} />
            ) : (
              <Table>
                <TableHead>
                  <Tr>
                    <Th>{t("columns.orderNumber")}</Th>
                    <Th>{t("columns.customer")}</Th>
                    <Th>{t("columns.total")}</Th>
                  </Tr>
                </TableHead>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <Tr key={order.id}>
                      <Td>{order.orderNumber}</Td>
                      <Td>{order.customerName ?? order.customerEmail}</Td>
                      <Td>{formatMoney(order.grandTotal)}</Td>
                    </Tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </AdminPageShell>
  );
}
