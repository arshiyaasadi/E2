"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { findMockUser } from "@/features/mocks/users.seed";
import {
  approveDeposit,
  mockResubmitReceipt,
  mockSubmitReceipt,
  rejectDeposit,
  useDeposits,
} from "@/features/payments/mocks/store";
import type { MockDeposit, PaymentStatus } from "@/features/payments/mocks/types";

const STATUS_FILTERS: Array<PaymentStatus | "all"> = [
  "all",
  "AwaitingPayment",
  "AwaitingReceiptReview",
  "NeedsCorrection",
  "Approved",
  "Rejected",
  "Expired",
  "Cancelled",
];

function formatAmount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function statusBadgeVariant(status: PaymentStatus): "primary" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "AwaitingReceiptReview":
      return "warning";
    case "Approved":
      return "success";
    case "NeedsCorrection":
    case "Rejected":
      return "danger";
    case "AwaitingPayment":
      return "primary";
    default:
      return "neutral";
  }
}

function latestAttempt(deposit: MockDeposit) {
  return deposit.attempts[deposit.attempts.length - 1] ?? null;
}

export function AdminDepositsPanel() {
  const t = useTranslations("admin.deposits");
  const deposits = useDeposits();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list =
      statusFilter === "all" ? deposits : deposits.filter((d) => d.status === statusFilter);
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [deposits, statusFilter]);

  const selected = deposits.find((d) => d.id === selectedId) ?? null;

  function run(action: () => { ok: true } | { ok: false; error: string }) {
    const result = action();
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <Alert variant="info">{t("mockBanner")}</Alert>

      {error ? (
        <Alert variant="danger" className="mt-mol">
          {error}
        </Alert>
      ) : null}

      <div className="mt-mol max-w-xs">
        <Select
          label={t("filters.status")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "all")}
          options={STATUS_FILTERS.map((value) => ({
            value,
            label: value === "all" ? t("filters.all") : t(`status.${value}`),
          }))}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} className="mt-mol" />
      ) : (
        <div className="mt-mol overflow-x-auto rounded-2xl border border-white/40 bg-white/25">
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.invoice")}</Th>
                <Th>{t("columns.user")}</Th>
                <Th>{t("columns.amount")}</Th>
                <Th>{t("columns.paid")}</Th>
                <Th>{t("columns.submitted")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((deposit) => {
                const user = findMockUser(deposit.userId);
                const attempt = latestAttempt(deposit);
                return (
                  <Tr key={deposit.id}>
                    <Td className="font-mono text-sm">{deposit.invoiceNumber}</Td>
                    <Td>{user?.displayName ?? deposit.userId}</Td>
                    <Td>{formatAmount(deposit.finalAmount)}</Td>
                    <Td>{attempt ? formatAmount(attempt.paidAmount) : "—"}</Td>
                    <Td className="text-xs text-muted">
                      {attempt
                        ? new Date(attempt.submittedAt).toLocaleString("fa-IR")
                        : "—"}
                    </Td>
                    <Td>
                      <Badge variant={statusBadgeVariant(deposit.status)}>
                        {t(`status.${deposit.status}`)}
                      </Badge>
                    </Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => setSelectedId(deposit.id)}>
                        {t("actions.view")}
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? t("detailTitle", { invoice: selected.invoiceNumber }) : ""}
        size="xl"
      >
        {selected ? (
          <>
            <ModalBody className="grid gap-mol">
              <div className="grid gap-mol sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">{t("detail.user")}</p>
                  <p className="font-medium">
                    {findMockUser(selected.userId)?.displayName ?? selected.userId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t("detail.status")}</p>
                  <Badge variant={statusBadgeVariant(selected.status)}>
                    {t(`status.${selected.status}`)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted">{t("detail.finalAmount")}</p>
                  <p className="font-medium">{formatAmount(selected.finalAmount)} ریال</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t("detail.snapshot")}</p>
                  <p className="text-sm">
                    {selected.accountSnapshot.holderName}
                    <br />
                    <span className="font-mono text-xs">
                      {selected.accountSnapshot.cardNumber ?? selected.accountSnapshot.iban}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-atom-md text-sm font-semibold">{t("detail.attempts")}</h4>
                {selected.attempts.length === 0 ? (
                  <p className="text-sm text-muted">{t("detail.noAttempts")}</p>
                ) : (
                  <div className="grid gap-mol">
                    {[...selected.attempts].reverse().map((attempt) => (
                      <div
                        key={attempt.id}
                        className="rounded-xl border border-white/40 bg-white/20 p-pad-mol"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-pad-atom">
                          <Badge
                            variant={
                              attempt.status === "Approved"
                                ? "success"
                                : attempt.status === "Rejected"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {t(`attemptStatus.${attempt.status}`)}
                          </Badge>
                          <span className="text-xs text-muted">
                            {new Date(attempt.submittedAt).toLocaleString("fa-IR")}
                          </span>
                        </div>
                        <p className="mt-atom-md text-sm">
                          {t("detail.paidAmount")}: {formatAmount(attempt.paidAmount)}
                        </p>
                        {attempt.rejectionReason ? (
                          <p className="mt-atom-md text-sm text-danger">{attempt.rejectionReason}</p>
                        ) : null}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={attempt.mediaUrl}
                          alt=""
                          className="mt-mol h-32 w-auto rounded-lg border border-white/30 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="mb-atom-md text-sm font-semibold">{t("detail.history")}</h4>
                <ul className="grid gap-atom-md text-sm">
                  {[...selected.history].reverse().map((event) => (
                    <li key={event.id} className="rounded-lg bg-white/15 px-pad-mol py-pad-atom">
                      <span className="font-medium">{t(`history.${event.action}`)}</span>
                      <span className="mx-atom text-muted">·</span>
                      <span className="text-xs text-muted">
                        {new Date(event.at).toLocaleString("fa-IR")}
                      </span>
                      {event.reason ? <p className="mt-atom text-danger">{event.reason}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            </ModalBody>
            <ModalFooter className="flex flex-wrap gap-pad-atom">
              {selected.status === "AwaitingPayment" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (run(() => mockSubmitReceipt(selected.id))) {
                      /* stay open */
                    }
                  }}
                >
                  {t("actions.fakeSubmit")}
                </Button>
              ) : null}
              {selected.status === "NeedsCorrection" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    run(() => mockResubmitReceipt(selected.id));
                  }}
                >
                  {t("actions.fakeResubmit")}
                </Button>
              ) : null}
              {selected.status === "AwaitingReceiptReview" ? (
                <>
                  <Button
                    onClick={() => {
                      if (run(() => approveDeposit(selected.id))) {
                        setSelectedId(null);
                      }
                    }}
                  >
                    {t("actions.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRejectReason("");
                      setRejectOpen(true);
                    }}
                  >
                    {t("actions.reject")}
                  </Button>
                </>
              ) : null}
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                {t("actions.close")}
              </Button>
            </ModalFooter>
          </>
        ) : null}
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={t("rejectTitle")} size="md">
        <ModalBody>
          <Input
            label={t("fields.rejectReason")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setRejectOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!selected) return;
              if (run(() => rejectDeposit(selected.id, rejectReason))) {
                setRejectOpen(false);
              }
            }}
          >
            {t("actions.confirmReject")}
          </Button>
        </ModalFooter>
      </Modal>
    </AdminPageShell>
  );
}
