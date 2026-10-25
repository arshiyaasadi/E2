"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
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
import {
  useCreatePromotion,
  useDeletePromotion,
  usePromotions,
  useUpdatePromotion,
} from "@/features/promotions/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { PromotionDto, PromotionType } from "@/types/domain";

interface PromotionFormState {
  name: string;
  type: PromotionType;
  value: string;
  isActive: boolean;
}

const emptyForm: PromotionFormState = {
  name: "",
  type: "percentage",
  value: "10",
  isActive: true,
};

function PromotionFormModal({
  open,
  mode,
  promotion,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  promotion: PromotionDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.promotions");
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const [form, setForm] = useState<PromotionFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && promotion) {
      setForm({
        name: promotion.name,
        type: promotion.type,
        value: String(promotion.value),
        isActive: promotion.isActive,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, mode, promotion]);

  async function onSave() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value || 0),
      isActive: form.isActive,
    };

    try {
      if (mode === "create") {
        await createPromotion.mutateAsync(payload);
      } else if (promotion) {
        await updatePromotion.mutateAsync({ promotionId: promotion.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createPromotion.isPending || updatePromotion.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="md"
    >
      <ModalBody className="grid gap-mol">
        <Input
          label={t("fields.name")}
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <Select
          label={t("fields.type")}
          value={form.type}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, type: event.target.value as PromotionType }))
          }
          options={[
            { value: "percentage", label: t("types.percentage") },
            { value: "fixed", label: t("types.fixed") },
          ]}
        />
        <Input
          label={t("fields.value")}
          type="number"
          value={form.value}
          onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
        />
        <Checkbox
          label={t("fields.isActive")}
          checked={form.isActive}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
        />
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button onClick={onSave} disabled={pending || !form.name.trim()}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminPromotionsPanel() {
  const t = useTranslations("admin.promotions");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "coupons.manage", user.role);
  const { data, isLoading, isError } = usePromotions();
  const deletePromotion = useDeletePromotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<PromotionDto | null>(null);

  async function onDelete(promotion: PromotionDto) {
    if (!window.confirm(t("confirmDelete", { name: promotion.name }))) return;
    try {
      await deletePromotion.mutateAsync(promotion.id);
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  if (!canManage) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={t("title")}
      description={t("subtitle")}
      stats={
        canManage ? (
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setMode("create");
                setSelected(null);
                setModalOpen(true);
              }}
            >
              {t("actions.create")}
            </Button>
          </div>
        ) : null
      }
    >
      <Card>
        {isLoading ? (
          <div className="flex justify-center py-org">
            <Spinner />
          </div>
        ) : isError ? (
          <Alert variant="danger">{t("error")}</Alert>
        ) : !data?.length ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.name")}</Th>
                <Th>{t("columns.type")}</Th>
                <Th>{t("columns.value")}</Th>
                <Th>{t("columns.targets")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((promotion) => (
                <Tr key={promotion.id}>
                  <Td>{promotion.name}</Td>
                  <Td>{t(`types.${promotion.type}`)}</Td>
                  <Td>{promotion.value}</Td>
                  <Td>{promotion.targets.length}</Td>
                  <Td>
                    <Badge variant={promotion.isActive ? "success" : "neutral"}>
                      {promotion.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </Td>
                  <Td className="flex gap-atom">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMode("edit");
                        setSelected(promotion);
                        setModalOpen(true);
                      }}
                    >
                      {t("actions.edit")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDelete(promotion)}>
                      {t("actions.delete")}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminAuditHistory entityType="promotion" className="mt-mol" />

      <PromotionFormModal
        open={modalOpen}
        mode={mode}
        promotion={selected}
        onClose={() => setModalOpen(false)}
      />
    </AdminPageShell>
  );
}
