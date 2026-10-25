"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Star } from "lucide-react";
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
  Toggle,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  deactivatePaymentAccount,
  setDefaultPaymentAccount,
  upsertPaymentAccount,
  usePaymentAccounts,
} from "@/features/payments/mocks/store";
import type { MockPaymentAccount } from "@/features/payments/mocks/types";

type FormState = {
  holderName: string;
  cardNumber: string;
  iban: string;
  bankName: string;
  label: string;
  isActive: boolean;
  isDefault: boolean;
};

const emptyForm: FormState = {
  holderName: "",
  cardNumber: "",
  iban: "",
  bankName: "",
  label: "",
  isActive: true,
  isDefault: false,
};

export function AdminPaymentAccountsPanel() {
  const t = useTranslations("admin.paymentAccounts");
  const accounts = usePaymentAccounts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MockPaymentAccount | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...accounts].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.holderName.localeCompare(b.holderName)),
    [accounts],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(account: MockPaymentAccount) {
    setEditing(account);
    setForm({
      holderName: account.holderName,
      cardNumber: account.cardNumber ?? "",
      iban: account.iban ?? "",
      bankName: account.bankName ?? "",
      label: account.label ?? "",
      isActive: account.isActive,
      isDefault: account.isDefault,
    });
    setError(null);
    setOpen(true);
  }

  function onSave() {
    const result = upsertPaymentAccount(
      {
        holderName: form.holderName,
        cardNumber: form.cardNumber || null,
        iban: form.iban || null,
        bankName: form.bankName || null,
        label: form.label || null,
        isActive: form.isActive,
        isDefault: form.isDefault,
      },
      editing?.id,
    );
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    setOpen(false);
  }

  function onDeactivate(account: MockPaymentAccount) {
    const result = deactivatePaymentAccount(account.id);
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
    }
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <Alert variant="info">{t("mockBanner")}</Alert>

      {error && !open ? (
        <Alert variant="danger" className="mt-mol">
          {error}
        </Alert>
      ) : null}

      <div className="mt-mol flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t("actions.create")}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} className="mt-mol" />
      ) : (
        <div className="mt-mol overflow-x-auto rounded-2xl border border-white/40 bg-white/25">
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.holder")}</Th>
                <Th>{t("columns.card")}</Th>
                <Th>{t("columns.iban")}</Th>
                <Th>{t("columns.bank")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {sorted.map((account) => (
                <Tr key={account.id}>
                  <Td>
                    <div className="flex flex-col gap-atom-md">
                      <span className="font-medium">{account.holderName}</span>
                      {account.label ? <span className="text-xs text-muted">{account.label}</span> : null}
                      {account.isDefault ? (
                        <Badge variant="success" className="w-fit">
                          <Star className="size-3" />
                          {t("default")}
                        </Badge>
                      ) : null}
                    </div>
                  </Td>
                  <Td className="font-mono text-sm">{account.cardNumber ?? "—"}</Td>
                  <Td className="font-mono text-xs">{account.iban ?? "—"}</Td>
                  <Td>{account.bankName ?? "—"}</Td>
                  <Td>
                    <Badge variant={account.isActive ? "success" : "neutral"}>
                      {account.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-pad-atom">
                      <Button size="sm" variant="outline" onClick={() => openEdit(account)}>
                        <Pencil className="size-3.5" />
                        {t("actions.edit")}
                      </Button>
                      {!account.isDefault && account.isActive ? (
                        <Button size="sm" variant="outline" onClick={() => setDefaultPaymentAccount(account.id)}>
                          {t("actions.setDefault")}
                        </Button>
                      ) : null}
                      {account.isActive ? (
                        <Button size="sm" variant="danger" onClick={() => onDeactivate(account)}>
                          {t("actions.deactivate")}
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("editTitle") : t("createTitle")} size="lg">
        <ModalBody className="grid gap-mol">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Input
            label={t("fields.holderName")}
            value={form.holderName}
            onChange={(e) => setForm((f) => ({ ...f, holderName: e.target.value }))}
            required
          />
          <Input
            label={t("fields.cardNumber")}
            value={form.cardNumber}
            onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))}
            hint={t("fields.cardOrIbanHint")}
          />
          <Input
            label={t("fields.iban")}
            value={form.iban}
            onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
          />
          <Input
            label={t("fields.bankName")}
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          />
          <Input
            label={t("fields.label")}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <Toggle
            checked={form.isActive}
            onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            label={t("fields.isActive")}
          />
          <Toggle
            checked={form.isDefault}
            onChange={(checked) => setForm((f) => ({ ...f, isDefault: checked, isActive: checked ? true : f.isActive }))}
            label={t("fields.isDefault")}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={onSave}>{t("actions.save")}</Button>
        </ModalFooter>
      </Modal>
    </AdminPageShell>
  );
}
