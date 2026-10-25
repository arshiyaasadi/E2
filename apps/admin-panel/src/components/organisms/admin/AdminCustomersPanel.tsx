"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Eye,
  Filter,
  ShoppingBag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Avatar,
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
  Tabs,
  Toggle,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { displayCustomerEmail } from "@/config/customer-auth";
import {
  useCustomer,
  useCustomerLoginLogs,
  useCustomerStats,
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/features/customers/queries";
import { useOrderStatuses } from "@/features/project/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { joinCustomerName, splitCustomerName } from "@/lib/validation/customer-name";
import { useAuthUser } from "@/store/slices/auth.slice";
import type {
  CustomerDetailDto,
  CustomerGrowthPointDto,
  CustomerLoginLogDto,
  CustomerSummaryDto,
  OrderStatusCode,
} from "@/types/domain";

const MiniMap = dynamic(
  () => import("@/components/organisms/admin/map/MiniMap").then((m) => m.MiniMap),
  {
    ssr: false,
    loading: () => <div className="h-20 w-28 shrink-0 animate-pulse rounded-lg bg-surface-2" />,
  },
);

type GrowthRange = "week" | "month";
type DetailTab = "info" | "addresses" | "orders" | "wishlist" | "cart" | "logins";
type OrderFilter = "all" | OrderStatusCode;

type CustomerFilters = {
  q: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: "" | "true" | "false";
};

const emptyFilters: CustomerFilters = {
  q: "",
  fullName: "",
  email: "",
  phone: "",
  isActive: "",
};

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("fa-IR")} ریال`;
}

function formatRelativeActivity(
  iso: string,
  t: (key: string, values?: Record<string, number | string>) => string,
) {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return t("relative.justNow");

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("relative.justNow");
  if (minutes < 60) return t("relative.minutes", { n: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relative.hours", { n: hours });

  const days = Math.floor(hours / 24);
  if (days === 1) return t("relative.yesterday");
  if (days < 7) return t("relative.days", { n: days });
  if (days < 14) return t("relative.week");
  if (days < 30) return t("relative.weeks", { n: Math.floor(days / 7) });
  if (days < 45) return t("relative.month");
  if (days < 365) return t("relative.months", { n: Math.floor(days / 30) });
  return t("relative.longAgo");
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

function CustomerGrowthChart({
  series,
  range,
  onRangeChange,
  periodTotal,
}: {
  series: CustomerGrowthPointDto[];
  range: GrowthRange;
  onRangeChange: (range: GrowthRange) => void;
  periodTotal: number;
}) {
  const t = useTranslations("admin.customers");
  const width = 280;
  const height = 72;
  const padX = 8;
  const padY = 10;
  const max = Math.max(...series.map((point) => point.count), 1);

  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? width / 2
        : padX + (index / (series.length - 1)) * (width - padX * 2);
    const y = height - padY - (point.count / max) * (height - padY * 2);
    return { x, y, ...point };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length
    ? `M ${points[0].x},${height - padY} L ${polyline.replace(/ /g, " L ")} L ${points[points.length - 1].x},${height - padY} Z`
    : "";

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-pad-atom-md p-mol-md">
      <div className="flex items-start justify-between gap-mol">
        <div>
          <p className="text-xs text-muted-foreground">{t("stats.growthTitle")}</p>
          <p className="mt-atom text-lg font-semibold text-foreground">
            {periodTotal.toLocaleString("fa-IR")}
            <span className="ms-atom text-xs font-normal text-muted-foreground">
              {t("stats.newInPeriod")}
            </span>
          </p>
        </div>
        <Tabs
          variant="boxed"
          active={range}
          onChange={(key) => onRangeChange(key as GrowthRange)}
          items={[
            { key: "week", label: t("stats.week") },
            { key: "month", label: t("stats.month") },
          ]}
        />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[4.5rem] w-full text-primary"
        role="img"
        aria-label={t("stats.growthTitle")}
      >
        <path d={area} fill="currentColor" className="opacity-10" />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
        {points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r={point.count > 0 ? 2.5 : 1.5}
            fill="currentColor"
            className={point.count > 0 ? "opacity-100" : "opacity-30"}
          />
        ))}
      </svg>
    </Card>
  );
}

function ConfirmToggleModal({
  open,
  activating,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  activating: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const t = useTranslations("admin.customers");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activating ? t("confirmActivateTitle") : t("confirmDeactivateTitle")}
      size="sm"
    >
      <ModalBody>
        <p className="text-sm text-muted-foreground">
          {activating ? t("confirmActivateBody") : t("confirmDeactivateBody")}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button
          variant={activating ? "primary" : "outline"}
          className={!activating ? "border-red-200 bg-red-50 text-danger hover:bg-red-100" : undefined}
          loading={pending}
          onClick={onConfirm}
        >
          {activating ? t("actions.activate") : t("actions.deactivate")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function CustomerDetailModal({
  customerId,
  open,
  onClose,
}: {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("admin.customers");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "orders.manage", user.role);
  const [activeTab, setActiveTab] = useState<DetailTab>("info");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState(false);

  const { data: customer, isLoading, isError } = useCustomer(customerId);
  const { data: loginLogs, isLoading: loginLogsLoading } = useCustomerLoginLogs(
    customerId,
    open && activeTab === "logins",
  );
  const { data: statusDefs } = useOrderStatuses();
  const updateCustomer = useUpdateCustomer();

  useEffect(() => {
    if (!open) return;
    setActiveTab("info");
    setOrderFilter("all");
    setError(null);
    setConfirmToggle(false);
  }, [open, customerId]);

  useEffect(() => {
    if (!customer) return;
    const parts = splitCustomerName(customer.fullName);
    setFirstName(parts.firstName);
    setLastName(parts.lastName);
    setEmail(displayCustomerEmail(customer.email));
    setIsActive(customer.isActive);
    setError(null);
  }, [customer]);

  const statusLabels = useMemo(() => {
    const map = new Map<string, string>();
    statusDefs?.forEach((def) => map.set(def.code, def.labelFa));
    return map;
  }, [statusDefs]);

  const sortedStatuses = useMemo(() => {
    if (!statusDefs) return [];
    return [...statusDefs].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [statusDefs]);

  const filteredOrders = useMemo(() => {
    if (!customer) return [];
    if (orderFilter === "all") return customer.orders;
    return customer.orders.filter((order) => order.status === orderFilter);
  }, [customer, orderFilter]);

  async function onSaveProfile() {
    if (!customerId) return;
    setError(null);
    try {
      await updateCustomer.mutateAsync({
        customerId,
        input: {
          fullName: joinCustomerName(firstName, lastName) || null,
          email: email.trim() || null,
        },
      });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onConfirmToggleActive() {
    if (!customerId || !customer) return;
    setError(null);
    try {
      await updateCustomer.mutateAsync({
        customerId,
        input: { isActive: !customer.isActive },
      });
      setIsActive(!customer.isActive);
      setConfirmToggle(false);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const tabItems = [
    { key: "info", label: t("tabs.info") },
    { key: "orders", label: t("tabs.orders"), count: customer?.ordersCount },
    { key: "addresses", label: t("tabs.addresses"), count: customer?.addresses.length },
    { key: "cart", label: t("tabs.cart"), count: customer?.cart?.items.length },
    { key: "wishlist", label: t("tabs.wishlist"), count: customer?.wishlistCount },
    { key: "logins", label: t("tabs.logins"), count: loginLogs?.length },
  ];

  const displayName = customer
    ? (customer.fullName ?? customer.phone ?? t("unnamed"))
    : t("detailTitle");
  const visibleEmail = customer ? displayCustomerEmail(customer.email) : "";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        size="xl"
        className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
        title={
          <div className="flex items-center gap-pad-mol">
            <Avatar name={displayName} size="md" status={customer?.isActive ? "online" : "offline"} />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{displayName}</h2>
              <p className="mt-0.5 truncate text-sm font-normal text-muted-foreground" dir="ltr">
                {[customer?.phone, visibleEmail].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            {customer ? (
              <Badge
                variant={customer.isActive ? "success" : "neutral"}
                className="ms-auto shrink-0"
              >
                {customer.isActive ? t("status.active") : t("status.inactive")}
              </Badge>
            ) : null}
          </div>
        }
      >
        <ModalBody className="flex-1 overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-mol-md py-pad-atom-md backdrop-blur">
            <Tabs
              variant="boxed"
              className="w-full"
              active={activeTab}
              onChange={(key) => setActiveTab(key as DetailTab)}
              items={tabItems}
            />
          </div>

          <div className="px-mol-md py-pad-mol">
            {isLoading ? (
              <div className="flex justify-center py-org">
                <Spinner />
              </div>
            ) : isError || !customer ? (
              <Alert variant="danger">{t("detailError")}</Alert>
            ) : activeTab === "info" ? (
              <CustomerInfoTab
                customer={customer}
                canManage={canManage}
                firstName={firstName}
                lastName={lastName}
                email={email}
                isActive={isActive}
                error={error}
                pending={updateCustomer.isPending}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onEmailChange={setEmail}
                onRequestToggle={() => setConfirmToggle(true)}
              />
            ) : activeTab === "addresses" ? (
              <CustomerAddressesTab customer={customer} />
            ) : activeTab === "logins" ? (
              <CustomerLoginsTab
                logs={loginLogs ?? []}
                isLoading={loginLogsLoading}
              />
            ) : activeTab === "orders" ? (
              <CustomerOrdersTab
                customer={customer}
                orderFilter={orderFilter}
                onOrderFilterChange={setOrderFilter}
                filteredOrders={filteredOrders}
                statusLabels={statusLabels}
                sortedStatuses={sortedStatuses}
              />
            ) : activeTab === "wishlist" ? (
              <CustomerWishlistTab customer={customer} />
            ) : (
              <CustomerCartTab customer={customer} />
            )}
          </div>
        </ModalBody>
        <ModalFooter className="sticky bottom-0 bg-surface/95 backdrop-blur">
          {activeTab === "info" && canManage && customer ? (
            <Button loading={updateCustomer.isPending} onClick={onSaveProfile}>
              {t("actions.save")}
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            {t("actions.close")}
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmToggleModal
        open={confirmToggle}
        activating={!customer?.isActive}
        pending={updateCustomer.isPending}
        onClose={() => setConfirmToggle(false)}
        onConfirm={onConfirmToggleActive}
      />
    </>
  );
}

function InfoStat({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground" dir={dir}>
        {value || "—"}
      </p>
    </div>
  );
}

function CustomerInfoTab({
  customer,
  canManage,
  firstName,
  lastName,
  email,
  isActive,
  error,
  pending,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onRequestToggle,
}: {
  customer: CustomerDetailDto;
  canManage: boolean;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  error: string | null;
  pending: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRequestToggle: () => void;
}) {
  const t = useTranslations("admin.customers");
  const visibleEmail = displayCustomerEmail(customer.email);

  return (
    <div className="grid gap-mol-md">
      <div className="grid grid-cols-2 gap-mol rounded-xl bg-surface-2/50 px-mol py-pad-mol sm:grid-cols-4">
        <InfoStat label={t("fields.phone")} value={customer.phone ?? ""} dir="ltr" />
        <InfoStat
          label={t("fields.ordersCount")}
          value={customer.ordersCount.toLocaleString("fa-IR")}
          dir="ltr"
        />
        <InfoStat
          label={t("fields.createdAt")}
          value={new Date(customer.createdAt).toLocaleDateString("fa-IR")}
        />
        <InfoStat
          label={t("fields.updatedAt")}
          value={new Date(customer.updatedAt).toLocaleDateString("fa-IR")}
        />
      </div>

      <div className="grid gap-mol">
        <p className="text-sm font-medium text-foreground">{t("sections.editable")}</p>
        <div className="grid gap-mol md:grid-cols-2">
          <Input
            label={t("fields.firstName")}
            value={canManage ? firstName : (splitCustomerName(customer.fullName).firstName || "")}
            onChange={(e) => onFirstNameChange(e.target.value)}
            readOnly={!canManage}
          />
          <Input
            label={t("fields.lastName")}
            value={canManage ? lastName : (splitCustomerName(customer.fullName).lastName || "")}
            onChange={(e) => onLastNameChange(e.target.value)}
            readOnly={!canManage}
          />
          <div className="md:col-span-2">
            <Input
              label={t("fields.email")}
              value={canManage ? email : visibleEmail}
              onChange={(e) => onEmailChange(e.target.value)}
              readOnly={!canManage}
              textDirection="ltr"
              placeholder={t("fields.emailPlaceholder")}
            />
          </div>
        </div>
      </div>

      {canManage ? (
        <div className="flex items-center justify-between gap-mol border-t border-border pt-pad-mol">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t("fields.accountStatus")}</p>
            <p className="text-xs text-muted-foreground">{t("fields.accountStatusHint")}</p>
          </div>
          <Toggle
            checked={isActive}
            onChange={() => onRequestToggle()}
            label={isActive ? t("status.active") : t("status.inactive")}
            disabled={pending}
          />
        </div>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}

function CustomerAddressesTab({ customer }: { customer: CustomerDetailDto }) {
  const t = useTranslations("admin.customers");

  if (customer.addresses.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyAddresses")}</p>;
  }

  return (
    <ul className="grid gap-mol">
      {customer.addresses.map((address) => (
        <li
          key={address.id}
          className="relative z-0 flex gap-pad-mol overflow-hidden rounded-xl border border-border/70 bg-white/40 p-pad-mol"
        >
          {address.latitude != null && address.longitude != null ? (
            <MiniMap
              lat={address.latitude}
              lng={address.longitude}
              className="relative z-0 h-24 w-28 shrink-0 isolate overflow-hidden rounded-lg border border-border/60"
            />
          ) : (
            <div className="relative z-0 flex h-24 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground">
              {t("noCoordinates")}
            </div>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <div className="mb-atom flex flex-wrap items-center gap-atom">
              <Badge variant="neutral">
                {address.type === "billing" ? t("addressType.billing") : t("addressType.shipping")}
              </Badge>
            </div>
            <p className="font-medium">
              {address.fullName}
              {address.phone ? (
                <>
                  {" · "}
                  <span dir="ltr">{address.phone}</span>
                </>
              ) : null}
            </p>
            <p>
              {address.province}، {address.city}
            </p>
            <p className="text-muted-foreground">
              {[address.addressLine, address.buildingNumber, address.unit, address.floor]
                .filter(Boolean)
                .join("، ")}
            </p>
            {address.postalCode ? (
              <p className="mt-atom text-xs text-muted-foreground" dir="ltr">
                {address.postalCode}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function CustomerLoginsTab({
  logs,
  isLoading,
}: {
  logs: CustomerLoginLogDto[];
  isLoading: boolean;
}) {
  const t = useTranslations("admin.customers");

  if (isLoading) {
    return (
      <div className="flex justify-center py-org">
        <Spinner />
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyLogins")}</p>;
  }

  return (
    <Table>
      <TableHead>
        <Tr>
          <Th>{t("columns.loginAt")}</Th>
          <Th>{t("columns.loginMethod")}</Th>
          <Th>{t("columns.loginIp")}</Th>
          <Th>{t("columns.loginUserAgent")}</Th>
        </Tr>
      </TableHead>
      <TableBody>
        {logs.map((log) => (
          <Tr key={log.id}>
            <Td>
              {new Date(log.createdAt).toLocaleString("fa-IR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Td>
            <Td>
              <Badge variant="neutral">
                {(["otp", "password", "register", "reset_password"] as const).includes(
                  log.method as "otp",
                )
                  ? t(`loginMethods.${log.method as "otp"}`)
                  : log.method}
              </Badge>
            </Td>
            <Td dir="ltr" className="font-mono text-xs">
              {log.ipAddress ?? "—"}
            </Td>
            <Td className="max-w-[220px] truncate text-xs text-muted-foreground" title={log.userAgent ?? undefined}>
              {log.userAgent ?? "—"}
            </Td>
          </Tr>
        ))}
      </TableBody>
    </Table>
  );
}

function CustomerOrdersTab({
  customer,
  orderFilter,
  onOrderFilterChange,
  filteredOrders,
  statusLabels,
  sortedStatuses,
}: {
  customer: CustomerDetailDto;
  orderFilter: OrderFilter;
  onOrderFilterChange: (value: OrderFilter) => void;
  filteredOrders: CustomerDetailDto["orders"];
  statusLabels: Map<string, string>;
  sortedStatuses: Array<{ code: string; labelFa: string }>;
}) {
  const t = useTranslations("admin.customers");

  return (
    <div className="grid gap-mol">
      <Tabs
        variant="pills"
        active={orderFilter}
        onChange={(key) => onOrderFilterChange(key as OrderFilter)}
        items={[
          { key: "all", label: t("orderFilters.all"), count: customer.orders.length },
          ...sortedStatuses.map((def) => ({
            key: def.code,
            label: def.labelFa,
            count: customer.orders.filter((order) => order.status === def.code).length,
          })),
        ]}
      />

      {filteredOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyOrders")}</p>
      ) : (
        <Table>
          <TableHead>
            <Tr>
              <Th>{t("columns.orderNumber")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th>{t("columns.total")}</Th>
              <Th>{t("columns.orderDate")}</Th>
            </Tr>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <Tr key={order.id}>
                <Td dir="ltr">{order.orderNumber}</Td>
                <Td>
                  <Badge variant={statusBadgeVariant(order.status)}>
                    {statusLabels.get(order.status) ?? order.status}
                  </Badge>
                </Td>
                <Td>{formatPrice(order.grandTotal)}</Td>
                <Td>{new Date(order.createdAt).toLocaleDateString("fa-IR")}</Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function CustomerWishlistTab({ customer }: { customer: CustomerDetailDto }) {
  const t = useTranslations("admin.customers");

  if (customer.wishlist.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyWishlist")}</p>;
  }

  return (
    <ul className="grid gap-atom">
      {customer.wishlist.map((item) => (
        <li
          key={item.productId}
          className="flex items-center justify-between gap-mol rounded-xl border border-border/70 bg-white/40 px-mol py-pad-atom-md text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">
              {item.slug}
            </p>
          </div>
          <span className="shrink-0 text-muted-foreground">{formatPrice(item.basePrice)}</span>
        </li>
      ))}
    </ul>
  );
}

function CustomerCartTab({ customer }: { customer: CustomerDetailDto }) {
  const t = useTranslations("admin.customers");

  if (!customer.cart || customer.cart.items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyCart")}</p>;
  }

  return (
    <div className="grid gap-mol">
      <p className="text-xs text-muted-foreground">
        {t("cartExpires", {
          date: new Date(customer.cart.expiresAt).toLocaleString("fa-IR"),
        })}
      </p>
      <ul className="grid gap-atom">
        {customer.cart.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-mol rounded-xl border border-border/70 bg-white/40 px-mol py-pad-atom-md text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{item.productTitle}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">
                {item.variantSku}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 shrink-0 text-muted-foreground">
              <ShoppingBag className="size-3.5" />
              × {item.quantity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminCustomersPanel() {
  const t = useTranslations("admin.customers");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "orders.view", user.role);
  const canManage = hasPermission(user.permissions, "orders.manage", user.role);

  const [draftFilters, setDraftFilters] = useState<CustomerFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<CustomerFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [growthRange, setGrowthRange] = useState<GrowthRange>("week");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const deleteCustomer = useDeleteCustomer();

  const listParams = useMemo(() => {
    const params: Record<string, string | undefined> = {
      q: appliedFilters.q.trim() || undefined,
      fullName: appliedFilters.fullName.trim() || undefined,
      email: appliedFilters.email.trim() || undefined,
      phone: appliedFilters.phone.trim() || undefined,
      isActive: appliedFilters.isActive || undefined,
    };
    return params;
  }, [appliedFilters]);

  const { data, isLoading, isError } = useCustomers(listParams);
  const { data: stats, isLoading: statsLoading } = useCustomerStats(growthRange);

  async function onDelete(customer: CustomerSummaryDto) {
    if (!window.confirm(t("confirmDelete", { email: customer.email }))) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (!canView) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <div className="mb-mol grid gap-mol md:grid-cols-[minmax(0,220px)_1fr]">
        <Card className="flex items-center gap-pad-atom-md p-mol-md">
          <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("stats.total")}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {statsLoading ? "…" : (stats?.total ?? 0).toLocaleString("fa-IR")}
            </p>
          </div>
        </Card>

        {stats ? (
          <CustomerGrowthChart
            series={stats.series}
            range={growthRange}
            onRangeChange={setGrowthRange}
            periodTotal={stats.periodTotal}
          />
        ) : (
          <Card className="flex min-h-[120px] items-center justify-center p-mol-md">
            <Spinner />
          </Card>
        )}
      </div>

      <div className="mb-mol grid gap-pad-atom-md">
        <div className="flex flex-col gap-pad-atom-md sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("fields.search")}
              placeholder={t("fields.searchPlaceholder")}
              value={draftFilters.q}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, q: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              label={t("fields.status")}
              value={draftFilters.isActive}
              options={[
                { value: "", label: t("filters.anyStatus") },
                { value: "true", label: t("status.active") },
                { value: "false", label: t("status.inactive") },
              ]}
              onChange={(event) => {
                const next = {
                  ...draftFilters,
                  isActive: event.target.value as CustomerFilters["isActive"],
                };
                setDraftFilters(next);
                setAppliedFilters(next);
              }}
            />
          </div>
          <div className="flex shrink-0 gap-pad-atom">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((open) => !open)}
              startIcon={<Filter className="size-4" />}
            >
              {t("actions.advancedFilters")}
            </Button>
            <Button onClick={applyFilters}>{t("actions.apply")}</Button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="grid gap-mol rounded-xl border border-border/70 bg-surface-2/30 p-mol md:grid-cols-3">
            <Input
              label={t("fields.fullName")}
              value={draftFilters.fullName}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, fullName: event.target.value }))
              }
            />
            <Input
              label={t("fields.phone")}
              value={draftFilters.phone}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, phone: event.target.value }))
              }
              textDirection="ltr"
            />
            <Input
              label={t("fields.email")}
              value={draftFilters.email}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, email: event.target.value }))
              }
              textDirection="ltr"
            />
          </div>
        ) : null}

        {(appliedFilters.q ||
          appliedFilters.fullName ||
          appliedFilters.email ||
          appliedFilters.phone ||
          appliedFilters.isActive) && (
          <div className="flex flex-wrap items-center gap-pad-atom text-sm text-muted-foreground">
            <span>{t("filters.active")}</span>
            {appliedFilters.q ? <span className="text-foreground">{appliedFilters.q}</span> : null}
            {appliedFilters.isActive ? (
              <span className="text-foreground">
                {appliedFilters.isActive === "true" ? t("status.active") : t("status.inactive")}
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted hover:text-foreground"
              onClick={resetFilters}
            >
              <X className="size-3.5" />
              {t("actions.resetFilters")}
            </button>
          </div>
        )}
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
                <Th>{t("columns.fullName")}</Th>
                <Th>{t("columns.phone")}</Th>
                <Th>{t("columns.email")}</Th>
                <Th>{t("columns.orders")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.lastActivity")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.items.map((customer) => (
                <Tr key={customer.id}>
                  <Td className="font-medium">{customer.fullName ?? "—"}</Td>
                  <Td dir="ltr">{customer.phone ?? "—"}</Td>
                  <Td dir="ltr" className="max-w-[180px] truncate text-muted-foreground">
                    {displayCustomerEmail(customer.email) || "—"}
                  </Td>
                  <Td>{customer.ordersCount.toLocaleString("fa-IR")}</Td>
                  <Td>
                    <Badge variant={customer.isActive ? "success" : "neutral"}>
                      {customer.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {formatRelativeActivity(customer.lastActivityAt, t)}
                  </Td>
                  <Td>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedId(customer.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                        aria-label={t("actions.view")}
                      >
                        <Eye className="size-4" />
                      </button>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => onDelete(customer)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200/80 bg-red-50/80 p-2 text-danger transition hover:bg-red-100"
                          aria-label={t("actions.delete")}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminAuditHistory entityType="customer" className="mt-mol" />

      <CustomerDetailModal
        customerId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
      />
    </AdminPageShell>
  );
}
