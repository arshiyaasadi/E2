"use client";

import { useEffect, useState } from "react";
import { CreditCard, Package, Settings2, Truck } from "lucide-react";
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
  Spinner,
  Toggle,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  useCreateShippingMethod,
  useDeleteShippingMethod,
  useOrderStatuses,
  usePaymentGateways,
  useShippingMethods,
  useStoreSettings,
  useUpdatePaymentGateway,
  useUpdateShippingMethod,
  useUpdateStoreSettings,
} from "@/features/project/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { ShippingMethodDto } from "@/types/domain";
import { cn } from "@/lib/utils";

type SettingsTab = "general" | "shipping" | "payments" | "orderStatuses";

const TABS: Array<{ id: SettingsTab; icon: typeof Settings2 }> = [
  { id: "general", icon: Settings2 },
  { id: "shipping", icon: Truck },
  { id: "payments", icon: CreditCard },
  { id: "orderStatuses", icon: Package },
];

function StoreSettingsForm() {
  const t = useTranslations("admin.project");
  const { data, isLoading, isError } = useStoreSettings();
  const updateSettings = useUpdateStoreSettings();
  const [taxRate, setTaxRate] = useState("");
  const [currency, setCurrency] = useState("IRR");
  const [cartTtl, setCartTtl] = useState("");
  const [reservationTtl, setReservationTtl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setTaxRate(String(data.taxRate));
    setCurrency(data.currency);
    setCartTtl(String(data.cartTtlSeconds));
    setReservationTtl(String(data.reservationTtlSeconds));
  }, [data]);

  async function onSave() {
    setError(null);
    try {
      await updateSettings.mutateAsync({
        taxRate: Number(taxRate),
        currency: currency.toUpperCase(),
        cartTtlSeconds: Number(cartTtl),
        reservationTtlSeconds: Number(reservationTtl),
      });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-mol-lg">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return <Alert variant="danger">{t("general.error")}</Alert>;
  }

  return (
    <Card className="max-w-2xl">
      <div className="grid gap-mol sm:grid-cols-2">
        <Input
          label={t("general.fields.taxRate")}
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={taxRate}
          onChange={(event) => setTaxRate(event.target.value)}
        />
        <Input
          label={t("general.fields.currency")}
          value={currency}
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value)}
        />
        <Input
          label={t("general.fields.cartTtl")}
          type="number"
          min={1}
          value={cartTtl}
          onChange={(event) => setCartTtl(event.target.value)}
        />
        <Input
          label={t("general.fields.reservationTtl")}
          type="number"
          min={1}
          value={reservationTtl}
          onChange={(event) => setReservationTtl(event.target.value)}
        />
      </div>

      {error ? <Alert variant="danger" className="mt-mol">{error}</Alert> : null}

      <div className="mt-mol flex justify-end">
        <Button loading={updateSettings.isPending} onClick={onSave}>
          {t("actions.save")}
        </Button>
      </div>
    </Card>
  );
}

interface ShippingFormState {
  name: string;
  description: string;
  baseCost: string;
  isActive: boolean;
}

const emptyShippingForm: ShippingFormState = {
  name: "",
  description: "",
  baseCost: "",
  isActive: true,
};

function ShippingMethodsSection() {
  const t = useTranslations("admin.project");
  const { data, isLoading, isError } = useShippingMethods();
  const createMethod = useCreateShippingMethod();
  const updateMethod = useUpdateShippingMethod();
  const deleteMethod = useDeleteShippingMethod();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingMethodDto | null>(null);
  const [form, setForm] = useState<ShippingFormState>(emptyShippingForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(emptyShippingForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(method: ShippingMethodDto) {
    setEditing(method);
    setForm({
      name: method.name,
      description: method.description ?? "",
      baseCost: String(method.baseCost),
      isActive: method.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  async function onSave() {
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        baseCost: Number(form.baseCost),
        isActive: form.isActive,
      };

      if (editing) {
        await updateMethod.mutateAsync({ id: editing.id, input: payload });
      } else {
        await createMethod.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onDelete(method: ShippingMethodDto) {
    if (!window.confirm(t("shipping.confirmDelete", { name: method.name }))) return;
    try {
      await deleteMethod.mutateAsync(method.id);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-mol-lg">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t("shipping.error")}</Alert>;
  }

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
          <p className="text-sm font-medium text-foreground">{t("shipping.title")}</p>
          <Button size="sm" onClick={openCreate}>
            {t("shipping.actions.create")}
          </Button>
        </div>

        {!data?.length ? (
          <EmptyState title={t("shipping.emptyTitle")} description={t("shipping.emptyDescription")} />
        ) : (
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("shipping.columns.name")}</Th>
                <Th>{t("shipping.columns.baseCost")}</Th>
                <Th>{t("shipping.columns.status")}</Th>
                <Th>{t("shipping.columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((method) => (
                <Tr key={method.id}>
                  <Td>
                    <div>
                      <p className="font-medium">{method.name}</p>
                      {method.description ? (
                        <p className="text-xs text-muted">{method.description}</p>
                      ) : null}
                    </div>
                  </Td>
                  <Td>{method.baseCost.toLocaleString("fa-IR")}</Td>
                  <Td>
                    <Badge variant={method.isActive ? "success" : "neutral"}>
                      {method.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-pad-atom">
                      <Button size="sm" variant="outline" onClick={() => openEdit(method)}>
                        {t("actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={deleteMethod.isPending}
                        onClick={() => onDelete(method)}
                      >
                        {t("actions.delete")}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {error && !modalOpen ? <Alert variant="danger">{error}</Alert> : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("shipping.editTitle") : t("shipping.createTitle")}>
        <ModalBody className="grid gap-mol">
          <Input
            label={t("shipping.fields.name")}
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label={t("shipping.fields.description")}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <Input
            label={t("shipping.fields.baseCost")}
            type="number"
            min={0}
            value={form.baseCost}
            onChange={(event) => setForm((prev) => ({ ...prev, baseCost: event.target.value }))}
          />
          <Toggle
            label={t("shipping.fields.isActive")}
            checked={form.isActive}
            onChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
          />
          {error ? <Alert variant="danger">{error}</Alert> : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button loading={createMethod.isPending || updateMethod.isPending} onClick={onSave}>
            {t("actions.save")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

function PaymentGatewaysSection() {
  const t = useTranslations("admin.project");
  const { data, isLoading, isError } = usePaymentGateways();
  const updateGateway = useUpdatePaymentGateway();
  const [error, setError] = useState<string | null>(null);
  const [cardConfig, setCardConfig] = useState<Record<string, { bankName: string; cardNumber: string; accountHolder: string }>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, { bankName: string; cardNumber: string; accountHolder: string }> = {};
    for (const gateway of data) {
      if (gateway.code !== "card_to_card") continue;
      const config =
        gateway.config && typeof gateway.config === "object" && !Array.isArray(gateway.config)
          ? (gateway.config as Record<string, unknown>)
          : {};
      next[gateway.id] = {
        bankName: typeof config.bankName === "string" ? config.bankName : "",
        cardNumber: typeof config.cardNumber === "string" ? config.cardNumber : "",
        accountHolder: typeof config.accountHolder === "string" ? config.accountHolder : "",
      };
    }
    setCardConfig(next);
  }, [data]);

  async function toggleField(id: string, field: "isActive" | "isEnabled", value: boolean) {
    setError(null);
    try {
      await updateGateway.mutateAsync({ id, input: { [field]: value } });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function saveCardConfig(id: string) {
    const values = cardConfig[id];
    if (!values) return;
    setError(null);
    try {
      await updateGateway.mutateAsync({
        id,
        input: {
          config: {
            bankName: values.bankName.trim(),
            cardNumber: values.cardNumber.replace(/\s+/g, "").trim(),
            accountHolder: values.accountHolder.trim(),
          },
        },
      });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-mol-lg">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t("payments.error")}</Alert>;
  }

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        {!data?.length ? (
          <EmptyState title={t("payments.emptyTitle")} description={t("payments.emptyDescription")} />
        ) : (
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("payments.columns.name")}</Th>
                <Th>{t("payments.columns.code")}</Th>
                <Th>{t("payments.columns.settlement")}</Th>
                <Th>{t("payments.columns.active")}</Th>
                <Th>{t("payments.columns.enabled")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((gateway) => (
                <Tr key={gateway.id}>
                  <Td className="font-medium">{gateway.name}</Td>
                  <Td className="font-mono text-xs">{gateway.code}</Td>
                  <Td>
                    <Badge variant="neutral">{gateway.settlementType}</Badge>
                  </Td>
                  <Td>
                    <Toggle
                      checked={gateway.isActive}
                      disabled={updateGateway.isPending}
                      size="sm"
                      onChange={(checked) => toggleField(gateway.id, "isActive", checked)}
                    />
                  </Td>
                  <Td>
                    <Toggle
                      checked={gateway.isEnabled}
                      disabled={updateGateway.isPending}
                      size="sm"
                      onChange={(checked) => toggleField(gateway.id, "isEnabled", checked)}
                    />
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {data
        ?.filter((gateway) => gateway.code === "card_to_card")
        .map((gateway) => {
          const values = cardConfig[gateway.id] ?? {
            bankName: "",
            cardNumber: "",
            accountHolder: "",
          };
          return (
            <Card key={`${gateway.id}-config`} className="mt-mol p-mol">
              <h3 className="mb-mol font-medium">{t("payments.cardToCard.title")}</h3>
              <p className="mb-mol text-sm text-muted">{t("payments.cardToCard.subtitle")}</p>
              <div className="grid gap-mol md:grid-cols-3">
                <Input
                  label={t("payments.cardToCard.bankName")}
                  value={values.bankName}
                  onChange={(event) =>
                    setCardConfig((prev) => ({
                      ...prev,
                      [gateway.id]: { ...values, bankName: event.target.value },
                    }))
                  }
                />
                <Input
                  label={t("payments.cardToCard.cardNumber")}
                  value={values.cardNumber}
                  onChange={(event) =>
                    setCardConfig((prev) => ({
                      ...prev,
                      [gateway.id]: { ...values, cardNumber: event.target.value },
                    }))
                  }
                  dir="ltr"
                />
                <Input
                  label={t("payments.cardToCard.accountHolder")}
                  value={values.accountHolder}
                  onChange={(event) =>
                    setCardConfig((prev) => ({
                      ...prev,
                      [gateway.id]: { ...values, accountHolder: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="mt-mol">
                <Button
                  onClick={() => saveCardConfig(gateway.id)}
                  disabled={updateGateway.isPending}
                >
                  {t("payments.cardToCard.save")}
                </Button>
              </div>
            </Card>
          );
        })}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </>
  );
}

function OrderStatusesSection() {
  const t = useTranslations("admin.project");
  const { data, isLoading, isError } = useOrderStatuses();

  if (isLoading) {
    return (
      <div className="flex justify-center py-mol-lg">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">{t("orderStatuses.error")}</Alert>;
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
        <p className="text-sm text-muted">{t("orderStatuses.subtitle")}</p>
      </div>
      {!data?.length ? (
        <EmptyState title={t("orderStatuses.emptyTitle")} description={t("orderStatuses.emptyDescription")} />
      ) : (
        <Table>
          <TableHead>
            <Tr hoverable={false}>
              <Th>{t("orderStatuses.columns.code")}</Th>
              <Th>{t("orderStatuses.columns.labelFa")}</Th>
              <Th>{t("orderStatuses.columns.labelEn")}</Th>
              <Th>{t("orderStatuses.columns.terminal")}</Th>
              <Th>{t("orderStatuses.columns.next")}</Th>
            </Tr>
          </TableHead>
          <TableBody>
            {data.map((status) => (
              <Tr key={status.code}>
                <Td className="font-mono text-xs">{status.code}</Td>
                <Td>{status.labelFa}</Td>
                <Td>{status.labelEn}</Td>
                <Td>
                  <Badge variant={status.isTerminal ? "warning" : "success"}>
                    {status.isTerminal ? t("orderStatuses.terminalYes") : t("orderStatuses.terminalNo")}
                  </Badge>
                </Td>
                <Td className="font-mono text-xs">
                  {status.allowedNextStatuses.length ? status.allowedNextStatuses.join(", ") : "—"}
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

export function AdminProjectSettingsPanel() {
  const t = useTranslations("admin.project");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "settings.manage", authUser.role);
  const [tab, setTab] = useState<SettingsTab>("general");

  if (!canManage) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <div className="flex flex-wrap gap-pad-atom">
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-pad-atom rounded-full border px-pad-mol py-pad-atom text-sm transition-all",
              tab === id
                ? "border-primary/30 bg-primary/10 font-medium text-primary ring-1 ring-primary/15"
                : "border-white/50 bg-white/40 text-muted hover:bg-white/65 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === "general" ? <StoreSettingsForm /> : null}
      {tab === "shipping" ? <ShippingMethodsSection /> : null}
      {tab === "payments" ? <PaymentGatewaysSection /> : null}
      {tab === "orderStatuses" ? <OrderStatusesSection /> : null}
    </AdminPageShell>
  );
}
