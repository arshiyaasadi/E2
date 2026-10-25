"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Spinner,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { useOrder, useOrders, useUpdateOrderStatus, useApproveOrderPayment, useRejectOrderPayment } from "@/features/orders/queries";
import { useOrderStatuses } from "@/features/project/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { OrderDetailDto, OrderStatusCode, OrderSummaryDto } from "@/types/domain";

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("fa-IR")} ریال`;
}

function statusBadgeVariant(status: OrderStatusCode) {
  switch (status) {
    case "delivered":
    case "paid":
      return "success" as const;
    case "shipped":
    case "processing":
      return "primary" as const;
    case "cancelled":
    case "refunded":
      return "danger" as const;
    case "pending":
    default:
      return "warning" as const;
  }
}

function OrderDetailModal({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("admin.orders");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "orders.manage", user.role);
  const { data: order, isLoading, isError } = useOrder(orderId);
  const { data: statusDefs } = useOrderStatuses();
  const updateStatus = useUpdateOrderStatus();
  const approvePayment = useApproveOrderPayment();
  const rejectPayment = useRejectOrderPayment();
  const [nextStatus, setNextStatus] = useState<OrderStatusCode | "">("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statusLabels = useMemo(() => {
    const map = new Map<string, string>();
    statusDefs?.forEach((def) => map.set(def.code, def.labelFa));
    return map;
  }, [statusDefs]);

  const sortedStatuses = useMemo(() => {
    if (!statusDefs) return [];
    return [...statusDefs].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [statusDefs]);

  function resetForm(current?: OrderDetailDto) {
    setNextStatus("");
    setTrackingNumber(current?.trackingNumber ?? "");
    setRejectReason("");
    setError(null);
  }

  async function onApprovePayment(paymentId: string) {
    if (!orderId) return;
    setError(null);
    try {
      await approvePayment.mutateAsync({ orderId, paymentId });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onRejectPayment(paymentId: string) {
    if (!orderId) return;
    if (!rejectReason.trim()) {
      setError(t("payment.rejectReasonRequired"));
      return;
    }
    setError(null);
    try {
      await rejectPayment.mutateAsync({
        orderId,
        paymentId,
        reason: rejectReason.trim(),
      });
      setRejectReason("");
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onApplyStatus() {
    if (!orderId || !nextStatus) return;
    setError(null);
    try {
      await updateStatus.mutateAsync({
        orderId,
        input: {
          status: nextStatus,
          trackingNumber: nextStatus === "shipped" ? trackingNumber.trim() || null : undefined,
        },
      });
      setNextStatus("");
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const detail = order;
  const currentIndex = detail
    ? sortedStatuses.findIndex((def) => def.code === detail.status)
    : -1;

  return (
    <Modal open={open} onClose={onClose} title={t("detailTitle")} size="xl">
      <ModalBody className="grid gap-mol">
        {isLoading ? (
          <div className="flex justify-center py-org">
            <Spinner />
          </div>
        ) : isError || !detail ? (
          <Alert variant="danger">{t("detailError")}</Alert>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-mol">
              <div>
                <p className="text-lg font-semibold">{detail.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {detail.customer.fullName ?? detail.customer.email}
                </p>
              </div>
              <Badge variant={statusBadgeVariant(detail.status)}>
                {statusLabels.get(detail.status) ?? detail.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-atom overflow-x-auto pb-atom">
              {sortedStatuses.map((def, index) => {
                const isPast = currentIndex >= 0 && index <= currentIndex;
                const isCurrent = def.code === detail.status;
                return (
                  <div key={def.code} className="flex items-center gap-atom">
                    <div
                      className={`flex min-w-[88px] flex-col items-center rounded-lg border px-pad-atom py-atom text-center text-xs ${
                        isCurrent
                          ? "border-primary bg-primary-50 text-primary-700"
                          : isPast
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">{def.labelFa}</span>
                    </div>
                    {index < sortedStatuses.length - 1 ? (
                      <span className="text-muted-foreground">←</span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-mol md:grid-cols-2">
              <Card className="p-mol">
                <h3 className="mb-mol font-medium">{t("sections.totals")}</h3>
                <dl className="grid gap-atom text-sm">
                  <div className="flex justify-between">
                    <dt>{t("fields.subtotal")}</dt>
                    <dd>{formatPrice(detail.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("fields.discount")}</dt>
                    <dd>{formatPrice(detail.discountTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{t("fields.shipping")}</dt>
                    <dd>{formatPrice(detail.shippingTotal)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>{t("fields.grandTotal")}</dt>
                    <dd>{formatPrice(detail.grandTotal)}</dd>
                  </div>
                </dl>
              </Card>
              <Card className="p-mol">
                <h3 className="mb-mol font-medium">{t("sections.shipping")}</h3>
                <dl className="grid gap-atom text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t("fields.method")}</dt>
                    <dd>{detail.shippingMethodName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("fields.tracking")}</dt>
                    <dd>{detail.trackingNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("fields.coupon")}</dt>
                    <dd>{detail.couponCode ?? "—"}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <Card className="p-mol">
              <h3 className="mb-mol font-medium">{t("sections.items")}</h3>
              <Table>
                <TableHead>
                  <Tr>
                    <Th>{t("columns.product")}</Th>
                    <Th>{t("columns.sku")}</Th>
                    <Th>{t("columns.qty")}</Th>
                    <Th>{t("columns.lineTotal")}</Th>
                  </Tr>
                </TableHead>
                <TableBody>
                  {detail.items.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <div>{item.productTitle}</div>
                        {item.variantLabel ? (
                          <div className="text-xs text-muted-foreground">{item.variantLabel}</div>
                        ) : null}
                      </Td>
                      <Td>{item.variantSku}</Td>
                      <Td>{item.quantity}</Td>
                      <Td>{formatPrice(item.lineTotal)}</Td>
                    </Tr>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {detail.payments.length > 0 ? (
              <Card className="p-mol">
                <h3 className="mb-mol font-medium">{t("sections.payment")}</h3>
                <div className="grid gap-mol">
                  {detail.payments.map((payment) => {
                    const awaitingReview =
                      payment.status === "pending" && !!payment.mediaUrl && canManage;
                    return (
                      <div
                        key={payment.id}
                        className="rounded-lg border border-border/70 p-mol text-sm"
                      >
                        <div className="mb-atom flex flex-wrap items-center justify-between gap-atom">
                          <div>
                            <p className="font-medium">
                              {payment.gatewayName ?? payment.gatewayCode ?? t("payment.gateway")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(payment.amount)} · {payment.status}
                            </p>
                          </div>
                          {payment.mediaUrl ? (
                            <a
                              href={payment.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              {t("payment.viewReceipt")}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("payment.noReceipt")}
                            </span>
                          )}
                        </div>
                        {payment.rejectReason ? (
                          <Alert variant="danger" className="mb-atom">
                            {t("payment.rejectReason")}: {payment.rejectReason}
                          </Alert>
                        ) : null}
                        {awaitingReview ? (
                          <div className="grid gap-mol">
                            <label className="grid gap-atom text-sm">
                              <span>{t("payment.rejectReasonLabel")}</span>
                              <textarea
                                value={rejectReason}
                                onChange={(event) => setRejectReason(event.target.value)}
                                rows={3}
                                className="w-full rounded-md border border-border bg-white/70 px-pad-mol py-pad-atom text-sm"
                                placeholder={t("payment.rejectReasonPlaceholder")}
                              />
                            </label>
                            {error ? <Alert variant="danger">{error}</Alert> : null}
                            <div className="flex flex-wrap gap-atom">
                              <Button
                                onClick={() => onApprovePayment(payment.id)}
                                disabled={approvePayment.isPending || rejectPayment.isPending}
                              >
                                {t("actions.approvePayment")}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => onRejectPayment(payment.id)}
                                disabled={approvePayment.isPending || rejectPayment.isPending}
                              >
                                {t("actions.rejectPayment")}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {canManage && !detail.isTerminal && detail.allowedNextStatuses.length > 0 ? (
              <Card className="p-mol">
                <h3 className="mb-mol font-medium">{t("sections.changeStatus")}</h3>
                <div className="grid gap-mol md:grid-cols-2">
                  <Select
                    label={t("fields.nextStatus")}
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as OrderStatusCode)}
                    options={detail.allowedNextStatuses.map((status) => ({
                      value: status,
                      label: statusLabels.get(status) ?? status,
                    }))}
                    placeholder={t("fields.selectStatus")}
                  />
                  {nextStatus === "shipped" ? (
                    <Input
                      label={t("fields.tracking")}
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                    />
                  ) : null}
                </div>
                {error ? <Alert variant="danger">{error}</Alert> : null}
                <div className="mt-mol">
                  <Button
                    onClick={onApplyStatus}
                    disabled={!nextStatus || updateStatus.isPending}
                  >
                    {t("actions.applyStatus")}
                  </Button>
                </div>
              </Card>
            ) : null}

            {detail.statusHistory.length > 0 ? (
              <Card className="p-mol">
                <h3 className="mb-mol font-medium">{t("sections.history")}</h3>
                <ul className="grid gap-atom text-sm">
                  {detail.statusHistory.map((entry) => (
                    <li key={entry.id} className="flex justify-between gap-mol border-b pb-atom">
                      <span>
                        {entry.fromStatus
                          ? `${statusLabels.get(entry.fromStatus) ?? entry.fromStatus} → `
                          : ""}
                        {statusLabels.get(entry.toStatus) ?? entry.toStatus}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString("fa-IR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
          {t("actions.close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminOrdersPanel() {
  const t = useTranslations("admin.orders");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "orders.view", user.role);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: statusDefs } = useOrderStatuses();

  const params = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: statusFilter || undefined,
    }),
    [q, statusFilter],
  );

  const { data, isLoading, isError } = useOrders(params);

  const statusLabels = useMemo(() => {
    const map = new Map<string, string>();
    statusDefs?.forEach((def) => map.set(def.code, def.labelFa));
    return map;
  }, [statusDefs]);

  if (!canView) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <div className="mb-mol flex flex-wrap gap-mol">
        <Input
          label={t("fields.search")}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="max-w-sm"
        />
        <Select
          label={t("fields.statusFilter")}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: "", label: t("fields.allStatuses") },
            ...(statusDefs?.map((def) => ({ value: def.code, label: def.labelFa })) ?? []),
          ]}
          className="max-w-xs"
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-org">
            <Spinner />
          </div>
        ) : isError ? (
          <Alert variant="danger">{t("error")}</Alert>
        ) : !data?.items.length ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.orderNumber")}</Th>
                <Th>{t("columns.customer")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.total")}</Th>
                <Th>{t("columns.date")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.items.map((order: OrderSummaryDto) => (
                <Tr key={order.id}>
                  <Td>{order.orderNumber}</Td>
                  <Td>
                    <div>{order.customerName ?? order.customerEmail}</div>
                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                  </Td>
                  <Td>
                    <Badge variant={statusBadgeVariant(order.status)}>
                      {statusLabels.get(order.status) ?? order.status}
                    </Badge>
                  </Td>
                  <Td>{formatPrice(order.grandTotal)}</Td>
                  <Td>{new Date(order.createdAt).toLocaleString("fa-IR")}</Td>
                  <Td>
                    <Button variant="outline" size="sm" onClick={() => setSelectedId(order.id)}>
                      {t("actions.view")}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminAuditHistory entityType="order" className="mt-mol" />

      <OrderDetailModal
        orderId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </AdminPageShell>
  );
}
