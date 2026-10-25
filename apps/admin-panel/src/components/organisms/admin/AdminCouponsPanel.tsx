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
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from "@/features/coupons/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { CouponBenefitType, CouponDto } from "@/types/domain";

interface CouponFormState {
  code: string;
  benefitType: CouponBenefitType;
  value: string;
  minOrderAmount: string;
  maxDiscount: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  firstOrderOnly: boolean;
  isWelcome: boolean;
  isActive: boolean;
}

const emptyForm: CouponFormState = {
  code: "",
  benefitType: "percentage",
  value: "10",
  minOrderAmount: "",
  maxDiscount: "",
  maxUses: "",
  maxUsesPerCustomer: "",
  firstOrderOnly: false,
  isWelcome: false,
  isActive: true,
};

function CouponFormModal({
  open,
  mode,
  coupon,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  coupon: CouponDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.coupons");
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const [form, setForm] = useState<CouponFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && coupon) {
      setForm({
        code: coupon.code,
        benefitType: coupon.benefitType,
        value: String(coupon.value),
        minOrderAmount: coupon.minOrderAmount != null ? String(coupon.minOrderAmount) : "",
        maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
        maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
        maxUsesPerCustomer:
          coupon.maxUsesPerCustomer != null ? String(coupon.maxUsesPerCustomer) : "",
        firstOrderOnly: coupon.scopes.some((s) => s.scopeType === "first_order"),
        isWelcome: coupon.isWelcome,
        isActive: coupon.isActive,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, mode, coupon]);

  async function onSave() {
    setError(null);
    const scopes = form.firstOrderOnly
      ? [{ scopeType: "order" as const }, { scopeType: "first_order" as const }]
      : [{ scopeType: "order" as const }];
    const payload = {
      code: form.code.trim(),
      benefitType: form.benefitType,
      value: Number(form.value || 0),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      maxUsesPerCustomer: form.maxUsesPerCustomer ? Number(form.maxUsesPerCustomer) : null,
      isActive: form.isActive,
      isWelcome: form.isWelcome,
      scopes,
    };

    try {
      if (mode === "create") {
        await createCoupon.mutateAsync(payload);
      } else if (coupon) {
        await updateCoupon.mutateAsync({ couponId: coupon.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createCoupon.isPending || updateCoupon.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="md"
    >
      <ModalBody className="grid gap-mol">
        <Input
          label={t("fields.code")}
          value={form.code}
          onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
        />
        <Select
          label={t("fields.benefitType")}
          value={form.benefitType}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, benefitType: event.target.value as CouponBenefitType }))
          }
          options={[
            { value: "percentage", label: t("benefitTypes.percentage") },
            { value: "fixed", label: t("benefitTypes.fixed") },
            { value: "free_shipping", label: t("benefitTypes.free_shipping") },
          ]}
        />
        {form.benefitType !== "free_shipping" ? (
          <Input
            label={t("fields.value")}
            type="number"
            value={form.value}
            onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
          />
        ) : null}
        <Input
          label={t("fields.minOrderAmount")}
          type="number"
          value={form.minOrderAmount}
          onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
        />
        <Input
          label={t("fields.maxDiscount")}
          type="number"
          value={form.maxDiscount}
          onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))}
        />
        <Input
          label={t("fields.maxUses")}
          type="number"
          value={form.maxUses}
          onChange={(event) => setForm((prev) => ({ ...prev, maxUses: event.target.value }))}
        />
        <Input
          label={t("fields.maxUsesPerCustomer")}
          type="number"
          value={form.maxUsesPerCustomer}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, maxUsesPerCustomer: event.target.value }))
          }
        />
        <Checkbox
          label={t("fields.firstOrderOnly")}
          checked={form.firstOrderOnly}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, firstOrderOnly: event.target.checked }))
          }
        />
        <Checkbox
          label={t("fields.isWelcome")}
          checked={form.isWelcome}
          onChange={(event) => setForm((prev) => ({ ...prev, isWelcome: event.target.checked }))}
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
        <Button onClick={onSave} disabled={pending || !form.code.trim()}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminCouponsPanel() {
  const t = useTranslations("admin.coupons");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "coupons.manage", user.role);
  const { data, isLoading, isError } = useCoupons();
  const deleteCoupon = useDeleteCoupon();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selected, setSelected] = useState<CouponDto | null>(null);

  function openCreate() {
    setMode("create");
    setSelected(null);
    setModalOpen(true);
  }

  function openEdit(coupon: CouponDto) {
    setMode("edit");
    setSelected(coupon);
    setModalOpen(true);
  }

  async function onDelete(coupon: CouponDto) {
    if (!window.confirm(t("confirmDelete", { code: coupon.code }))) return;
    try {
      await deleteCoupon.mutateAsync(coupon.id);
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
        <div className="flex justify-end">
          <Button onClick={openCreate}>{t("actions.create")}</Button>
        </div>
      }
    >
      <Card className="mb-mol">
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
                <Th>{t("columns.code")}</Th>
                <Th>{t("columns.type")}</Th>
                <Th>{t("columns.value")}</Th>
                <Th>{t("columns.used")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((coupon) => (
                <Tr key={coupon.id}>
                  <Td>{coupon.code}</Td>
                  <Td>{t(`benefitTypes.${coupon.benefitType}`)}</Td>
                  <Td>{coupon.benefitType === "free_shipping" ? "—" : coupon.value}</Td>
                  <Td>
                    {coupon.usedCount}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-atom">
                      <Badge variant={coupon.isActive ? "success" : "neutral"}>
                        {coupon.isActive ? t("status.active") : t("status.inactive")}
                      </Badge>
                      {coupon.isWelcome ? (
                        <Badge variant="primary">{t("status.welcome")}</Badge>
                      ) : null}
                    </div>
                  </Td>
                  <Td className="flex gap-atom">
                    <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                      {t("actions.edit")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDelete(coupon)}>
                      {t("actions.delete")}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminAuditHistory entityType="coupon" className="mt-mol" />

      <CouponFormModal
        open={modalOpen}
        mode={mode}
        coupon={selected}
        onClose={() => setModalOpen(false)}
      />
    </AdminPageShell>
  );
}
