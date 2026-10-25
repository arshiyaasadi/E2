"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MapPinned,
  Radio,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Spinner,
  Tabs,
  Toggle,
} from "@/components/atoms";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { hasPermission } from "@/config/roles";
import {
  useInvokeShippingProvider,
  useShippingProviders,
  useUpdateShippingProvider,
} from "@/features/shipping/queries";
import { handleApiError } from "@/lib/api/client";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";
import type { ShippingFeatureId, ShippingProviderDto } from "@/types/domain";

type ToolTab =
  | "overview"
  | "config"
  | "cities"
  | "pricing"
  | "orders"
  | "tracking"
  | "parcels"
  | "account"
  | "financial"
  | "tickets";

const FEATURE_ORDER: ShippingFeatureId[] = [
  "auth",
  "addresses",
  "cities",
  "customers",
  "orders",
  "pricing",
  "parcels",
  "tracking",
  "financial",
  "ticketing",
  "webhooks",
  "locker",
];

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-white/40 bg-black/5 p-pad-mol text-xs leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ProviderConfigForm({ provider }: { provider: ShippingProviderDto }) {
  const t = useTranslations("admin.shippingProviders");
  const updateProvider = useUpdateShippingProvider();
  const invoke = useInvokeShippingProvider();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://omtestapi.tipax.ir");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultOriginAddressId, setDefaultOriginAddressId] = useState("");
  const [defaultServiceId, setDefaultServiceId] = useState("1");
  const [defaultPaymentType, setDefaultPaymentType] = useState("10");
  const [defaultPickupType, setDefaultPickupType] = useState("10");
  const [defaultDistributionType, setDefaultDistributionType] = useState("10");

  useEffect(() => {
    const cfg = provider.config ?? {};
    setBaseUrl(String(cfg.baseUrl || "https://omtestapi.tipax.ir"));
    setUsername(String(cfg.username ?? ""));
    setPassword("");
    setApiKey("");
    setDefaultOriginAddressId(
      cfg.defaultOriginAddressId == null ? "" : String(cfg.defaultOriginAddressId),
    );
    setDefaultServiceId(String(cfg.defaultServiceId ?? 1));
    setDefaultPaymentType(String(cfg.defaultPaymentType ?? 10));
    setDefaultPickupType(String(cfg.defaultPickupType ?? 10));
    setDefaultDistributionType(String(cfg.defaultDistributionType ?? 10));
    setError(null);
    setSuccess(null);
  }, [provider.id, provider.updatedAt]);

  if (provider.code !== "tipax") {
    return (
      <div className="rounded-xl border border-white/45 bg-white/35 p-pad-mol text-sm text-muted">
        {t("config.manualOnly")}
      </div>
    );
  }

  async function onSave() {
    setError(null);
    setSuccess(null);
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        input: {
          config: {
            baseUrl,
            username,
            password: password.trim() || undefined,
            apiKey: apiKey.trim() || undefined,
            defaultOriginAddressId: defaultOriginAddressId
              ? Number(defaultOriginAddressId)
              : null,
            defaultServiceId: Number(defaultServiceId || 1),
            defaultPaymentType: Number(defaultPaymentType || 10),
            defaultPickupType: Number(defaultPickupType || 10),
            defaultDistributionType: Number(defaultDistributionType || 10),
          },
        },
      });
      setPassword("");
      setApiKey("");
      setSuccess(t("config.saved"));
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function onObtainToken() {
    setError(null);
    setSuccess(null);
    try {
      await invoke.mutateAsync({
        id: provider.id,
        input: { action: "obtainToken" },
      });
      setSuccess(t("config.tokenOk"));
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  return (
    <div className="flex flex-col gap-mol">
      <div className="flex items-start gap-pad-mol rounded-xl border border-primary/20 bg-primary/5 p-pad-mol">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-pad-atom text-sm">
          <p className="font-medium text-foreground">{t("config.inlineTitle")}</p>
          <p className="text-muted">{t("config.inlineHint")}</p>
        </div>
      </div>

      <Input label={t("config.baseUrl")} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      <div className="grid gap-mol sm:grid-cols-2">
        <Input
          label={t("config.username")}
          value={username}
          autoComplete="off"
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          label={t("config.password")}
          type="password"
          autoComplete="new-password"
          value={password}
          placeholder={
            provider.config.passwordSet
              ? t("config.passwordPlaceholderSet")
              : t("config.passwordPlaceholder")
          }
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Input
        label={t("config.apiKey")}
        type="password"
        autoComplete="off"
        value={apiKey}
        placeholder={
          provider.config.apiKeySet
            ? t("config.apiKeyPlaceholderSet")
            : t("config.apiKeyPlaceholder")
        }
        onChange={(e) => setApiKey(e.target.value)}
      />

      <div className="grid gap-mol sm:grid-cols-2">
        <Input
          label={t("config.defaultOriginAddressId")}
          value={defaultOriginAddressId}
          onChange={(e) => setDefaultOriginAddressId(e.target.value)}
        />
        <Input
          label={t("config.defaultServiceId")}
          value={defaultServiceId}
          onChange={(e) => setDefaultServiceId(e.target.value)}
        />
        <Input
          label={t("config.defaultPaymentType")}
          value={defaultPaymentType}
          onChange={(e) => setDefaultPaymentType(e.target.value)}
        />
        <Input
          label={t("config.defaultPickupType")}
          value={defaultPickupType}
          onChange={(e) => setDefaultPickupType(e.target.value)}
        />
        <Input
          label={t("config.defaultDistributionType")}
          value={defaultDistributionType}
          onChange={(e) => setDefaultDistributionType(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-white/45 bg-white/40 px-pad-mol py-pad-mol text-sm">
        <p className="font-medium">{t("config.tokenStatus")}</p>
        <p className="mt-pad-atom text-muted">
          {provider.config.tokenSet
            ? t("config.tokenReady", {
                expiresAt: String(provider.config.expiresAt ?? "—"),
              })
            : t("config.tokenMissing")}
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <div className="flex flex-wrap justify-end gap-pad-atom">
        <Button
          variant="secondary"
          loading={invoke.isPending}
          onClick={onObtainToken}
        >
          {t("actions.obtainToken")}
        </Button>
        <Button loading={updateProvider.isPending} onClick={onSave}>
          {t("actions.saveConfig")}
        </Button>
      </div>
    </div>
  );
}

function ProviderTools({
  provider,
  initialTab = "overview",
}: {
  provider: ShippingProviderDto;
  initialTab?: ToolTab;
}) {
  const t = useTranslations("admin.shippingProviders");
  const invoke = useInvokeShippingProvider();
  const [tab, setTab] = useState<ToolTab>(initialTab);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [orderId, setOrderId] = useState("");
  const [jsonBody, setJsonBody] = useState("{\n  \n}");

  useEffect(() => {
    setTab(initialTab);
    setResult(null);
    setError(null);
  }, [provider.id, initialTab]);

  async function run(action: string, payload?: Record<string, unknown>) {
    setError(null);
    setResult(null);
    try {
      const data = await invoke.mutateAsync({
        id: provider.id,
        input: { action, payload },
      });
      setResult(data);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function parseJsonBody(): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(jsonBody || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      setError(t("tools.invalidJson"));
      return null;
    } catch {
      setError(t("tools.invalidJson"));
      return null;
    }
  }

  const tabs = [
    { key: "overview", label: t("tools.tabs.overview") },
    { key: "config", label: t("tools.tabs.config") },
    { key: "cities", label: t("tools.tabs.cities") },
    { key: "pricing", label: t("tools.tabs.pricing") },
    { key: "orders", label: t("tools.tabs.orders") },
    { key: "tracking", label: t("tools.tabs.tracking") },
    { key: "parcels", label: t("tools.tabs.parcels") },
    { key: "account", label: t("tools.tabs.account") },
    { key: "financial", label: t("tools.tabs.financial") },
    { key: "tickets", label: t("tools.tabs.tickets") },
  ];

  return (
    <Card className="flex flex-col gap-mol">
      <div className="flex flex-wrap items-start justify-between gap-pad-mol">
        <div>
          <h3 className="text-base font-semibold">{t("tools.title", { name: provider.name })}</h3>
          <p className="text-sm text-muted">{t("tools.subtitle")}</p>
        </div>
        <Badge variant={provider.isEnabled ? "success" : "neutral"}>
          {provider.isEnabled ? t("status.enabled") : t("status.disabled")}
        </Badge>
      </div>

      <Tabs items={tabs} active={tab} onChange={(key) => setTab(key as ToolTab)} variant="pills" />

      {tab === "overview" ? (
        <div className="grid gap-pad-mol sm:grid-cols-2">
          <div className="rounded-xl border border-white/45 bg-white/35 p-pad-mol">
            <p className="mb-pad-atom text-xs font-medium text-muted">{t("tools.capabilities")}</p>
            <div className="flex flex-wrap gap-pad-atom">
              {FEATURE_ORDER.map((id) => {
                const feature = provider.features.find((f) => f.id === id);
                if (!feature) return null;
                return (
                  <Badge key={id} variant={feature.supported ? "success" : "neutral"}>
                    {t(`features.${id}`)}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-white/45 bg-white/35 p-pad-mol text-sm text-muted">
            <p>{provider.description}</p>
            <p className="mt-pad-mol font-mono text-xs">code: {provider.code}</p>
          </div>
        </div>
      ) : null}

      {tab === "config" ? <ProviderConfigForm provider={provider} /> : null}

      {tab === "cities" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("listStates")}>
            {t("tools.actions.listStates")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("listCities")}>
            {t("tools.actions.listCities")}
          </Button>
          <Button
            loading={invoke.isPending}
            variant="secondary"
            onClick={() => run("listCitiesWithState")}
          >
            {t("tools.actions.listCitiesWithState")}
          </Button>
          <Button
            loading={invoke.isPending}
            variant="ghost"
            onClick={() => run("listBranchCities")}
          >
            {t("tools.actions.listBranchCities")}
          </Button>
          <Button
            loading={invoke.isPending}
            variant="ghost"
            onClick={() => run("listAddressBook")}
          >
            {t("tools.actions.listAddressBook")}
          </Button>
        </div>
      ) : null}

      {tab === "pricing" || tab === "orders" ? (
        <div className="flex flex-col gap-mol">
          <label className="text-sm font-medium">{t("tools.jsonBody")}</label>
          <textarea
            className="min-h-40 rounded-xl border border-white/50 bg-white/50 p-pad-mol font-mono text-xs"
            value={jsonBody}
            onChange={(e) => setJsonBody(e.target.value)}
          />
          <div className="flex flex-wrap gap-pad-atom">
            {tab === "pricing" ? (
              <>
                <Button
                  loading={invoke.isPending}
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("price", body);
                  }}
                >
                  {t("tools.actions.price")}
                </Button>
                <Button
                  loading={invoke.isPending}
                  variant="secondary"
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("priceForAllServices", body);
                  }}
                >
                  {t("tools.actions.priceForAllServices")}
                </Button>
                <Button
                  loading={invoke.isPending}
                  variant="ghost"
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("getServicesBetweenCities", body);
                  }}
                >
                  {t("tools.actions.getServicesBetweenCities")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  loading={invoke.isPending}
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("createOrder", body);
                  }}
                >
                  {t("tools.actions.createOrder")}
                </Button>
                <Button
                  loading={invoke.isPending}
                  variant="secondary"
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("createOrderWithPreDefinedOrigin", body);
                  }}
                >
                  {t("tools.actions.createOrderWithPreDefinedOrigin")}
                </Button>
                <Button
                  loading={invoke.isPending}
                  variant="ghost"
                  onClick={() => {
                    const body = parseJsonBody();
                    if (body) void run("createOrderWithCoordinates", body);
                  }}
                >
                  {t("tools.actions.createOrderWithCoordinates")}
                </Button>
                <Button
                  loading={invoke.isPending}
                  variant="danger"
                  onClick={() => run("cancelOrder", { orderId })}
                >
                  {t("tools.actions.cancelOrder")}
                </Button>
              </>
            )}
          </div>
          {tab === "orders" ? (
            <Input
              label={t("tools.fields.orderId")}
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "tracking" ? (
        <div className="flex flex-col gap-mol">
          <Input
            label={t("tools.fields.trackingCode")}
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value)}
          />
          <Input
            label={t("tools.fields.orderId")}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
          <div className="flex flex-wrap gap-pad-atom">
            <Button
              loading={invoke.isPending}
              onClick={() => run("trackBrief", { trackingInput: trackingCode })}
            >
              {t("tools.actions.trackBrief")}
            </Button>
            <Button
              loading={invoke.isPending}
              variant="secondary"
              onClick={() => run("trackByOrderId", { orderId })}
            >
              {t("tools.actions.trackByOrderId")}
            </Button>
            <Button
              loading={invoke.isPending}
              variant="ghost"
              onClick={() => run("trackByTraceCode", { traceCode: trackingCode })}
            >
              {t("tools.actions.trackByTraceCode")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "parcels" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("listPackContentRates")}>
            {t("tools.actions.listPackContentRates")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("listPackingPrices")}>
            {t("tools.actions.listPackingPrices")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("searchParcelTypes", {})}>
            {t("tools.actions.searchParcelTypes")}
          </Button>
          <Button loading={invoke.isPending} variant="ghost" onClick={() => run("searchPaymentTypes", {})}>
            {t("tools.actions.searchPaymentTypes")}
          </Button>
          <Button loading={invoke.isPending} variant="ghost" onClick={() => run("listParcelBooks")}>
            {t("tools.actions.listParcelBooks")}
          </Button>
          <Button
            loading={invoke.isPending}
            onClick={() => run("getParcelsByOrderId", { orderId })}
          >
            {t("tools.actions.getParcelsByOrderId")}
          </Button>
        </div>
      ) : null}

      {tab === "account" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("getCurrentCustomer")}>
            {t("tools.actions.getCurrentCustomer")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("getCredit")}>
            {t("tools.actions.getCredit")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("getWallet")}>
            {t("tools.actions.getWallet")}
          </Button>
          <Button loading={invoke.isPending} variant="ghost" onClick={() => run("getRemain")}>
            {t("tools.actions.getRemain")}
          </Button>
          <Button loading={invoke.isPending} variant="ghost" onClick={() => run("listMySubstations")}>
            {t("tools.actions.listMySubstations")}
          </Button>
        </div>
      ) : null}

      {tab === "financial" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("listFinancialDocuments")}>
            {t("tools.actions.listFinancialDocuments")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("listWebhooks")}>
            {t("tools.actions.listWebhooks")}
          </Button>
          <Button
            loading={invoke.isPending}
            variant="ghost"
            onClick={() => run("getNextDayTimeTable")}
          >
            {t("tools.actions.getNextDayTimeTable")}
          </Button>
        </div>
      ) : null}

      {tab === "tickets" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("listTickets")}>
            {t("tools.actions.listTickets")}
          </Button>
          <Button
            loading={invoke.isPending}
            variant="secondary"
            onClick={() => run("listTicketDepartments")}
          >
            {t("tools.actions.listTicketDepartments")}
          </Button>
        </div>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {result != null ? <JsonPreview value={result} /> : null}
    </Card>
  );
}

function ProviderSlider({
  providers,
  selectedId,
  onSelect,
  onToggleEnabled,
  onToggleActive,
  onConfigure,
  updating,
}: {
  providers: ShippingProviderDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleEnabled: (provider: ShippingProviderDto, enabled: boolean) => void;
  onToggleActive: (provider: ShippingProviderDto, active: boolean) => void;
  onConfigure: (provider: ShippingProviderDto) => void;
  updating: boolean;
}) {
  const t = useTranslations("admin.shippingProviders");
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-provider-card]");
    const amount = (card?.offsetWidth ?? 280) + 16;
    el.scrollBy({ left: direction * amount * -1, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="mb-pad-mol flex items-center justify-between gap-pad-mol">
        <p className="text-sm font-medium">{t("slider.title")}</p>
        <div className="flex gap-pad-atom">
          <Button type="button" size="sm" variant="outline" onClick={() => scrollByCard(-1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => scrollByCard(1)}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-mol overflow-x-auto pb-pad-atom [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {providers.map((provider) => {
          const isSelected = selectedId === provider.id;
          const supportedCount = provider.features.filter((f) => f.supported).length;
          return (
            <div
              key={provider.id}
              data-provider-card
              className="w-[min(100%,20rem)] shrink-0 snap-start sm:w-[22rem]"
            >
              <button
                type="button"
                onClick={() => onSelect(provider.id)}
                className={cn(
                  "flex h-full w-full flex-col gap-pad-mol rounded-2xl border p-pad-mol text-right transition-all",
                  isSelected
                    ? "border-primary/35 bg-primary/8 shadow-[0_12px_30px_rgba(63,94,251,0.12)] ring-1 ring-primary/20"
                    : "border-white/50 bg-white/45 hover:bg-white/65",
                )}
              >
                <div className="flex flex-wrap items-center gap-pad-atom">
                  <h3 className="text-base font-semibold">{provider.name}</h3>
                  <Badge variant="neutral">{provider.code}</Badge>
                  {provider.isEnabled ? (
                    <Badge variant="success">
                      <span className="inline-flex items-center gap-1">
                        <Radio className="size-3" />
                        {t("status.primary")}
                      </span>
                    </Badge>
                  ) : null}
                  {provider.code === "tipax" && provider.config.tokenSet ? (
                    <Badge variant="primary">{t("config.tokenBadge")}</Badge>
                  ) : null}
                  {provider.code === "tipax" && !provider.config.apiKeySet ? (
                    <Badge variant="warning">{t("config.needsKey")}</Badge>
                  ) : null}
                </div>
                <p className="line-clamp-3 min-h-[3.75rem] text-sm text-muted">{provider.description}</p>
                <p className="text-xs text-muted">{t("supportedCount", { count: supportedCount })}</p>
                <div
                  className="mt-auto flex flex-col gap-pad-atom border-t border-white/40 pt-pad-mol"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t("fields.enabled")}</span>
                    <Toggle
                      checked={provider.isEnabled}
                      disabled={updating || !provider.isActive}
                      size="sm"
                      onChange={(checked) => onToggleEnabled(provider, checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t("fields.active")}</span>
                    <Toggle
                      checked={provider.isActive}
                      disabled={updating}
                      size="sm"
                      onChange={(checked) => onToggleActive(provider, checked)}
                    />
                  </div>
                  {provider.code === "tipax" ? (
                    <Button size="sm" variant="secondary" fullWidth onClick={() => onConfigure(provider)}>
                      <KeyRound className="size-3.5" />
                      {t("actions.setCredentials")}
                    </Button>
                  ) : null}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminShippingProvidersPanel() {
  const t = useTranslations("admin.shippingProviders");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "settings.manage", authUser.role);
  const { data, isLoading, isError } = useShippingProviders();
  const updateProvider = useUpdateShippingProvider();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolsTab, setToolsTab] = useState<ToolTab>("overview");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => data?.find((p) => p.id === selectedId) ?? data?.find((p) => p.isEnabled) ?? data?.[0] ?? null,
    [data, selectedId],
  );

  async function toggleEnabled(provider: ShippingProviderDto, enabled: boolean) {
    setError(null);
    try {
      await updateProvider.mutateAsync({ id: provider.id, input: { isEnabled: enabled } });
      setSelectedId(provider.id);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function toggleActive(provider: ShippingProviderDto, active: boolean) {
    setError(null);
    try {
      await updateProvider.mutateAsync({ id: provider.id, input: { isActive: active } });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  if (!canManage) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
  }

  if (isLoading) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <div className="flex justify-center py-mol-lg">
          <Spinner />
        </div>
      </AdminPageShell>
    );
  }

  if (isError) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="danger">{t("error")}</Alert>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-l from-primary/10 via-white/40 to-transparent p-pad-mol">
        <div className="flex items-start gap-pad-mol">
          <div className="rounded-xl bg-primary/15 p-pad-mol text-primary">
            <Truck className="size-5" />
          </div>
          <div className="space-y-pad-atom">
            <p className="text-sm font-medium">{t("hero.title")}</p>
            <p className="text-sm text-muted">{t("hero.description")}</p>
          </div>
        </div>
      </div>

      {!data?.length ? (
        <Card>
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        </Card>
      ) : (
        <div className="flex flex-col gap-mol">
          <ProviderSlider
            providers={data}
            selectedId={selected?.id ?? null}
            onSelect={(id) => {
              setSelectedId(id);
              setToolsTab("overview");
            }}
            onToggleEnabled={toggleEnabled}
            onToggleActive={toggleActive}
            onConfigure={(provider) => {
              setSelectedId(provider.id);
              setToolsTab("config");
            }}
            updating={updateProvider.isPending}
          />

          {selected ? (
            <ProviderTools key={selected.id} provider={selected} initialTab={toolsTab} />
          ) : null}

          <Card className="flex flex-col gap-pad-mol text-sm text-muted">
            <div className="flex items-center gap-pad-atom text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">{t("hints.title")}</span>
            </div>
            <ul className="list-disc space-y-pad-atom pr-pad-mol">
              <li>{t("hints.onePrimary")}</li>
              <li>{t("hints.tipaxAuth")}</li>
              <li>{t("hints.addressFields")}</li>
            </ul>
            <div className="flex items-start gap-pad-atom rounded-xl border border-amber-500/20 bg-amber-500/10 p-pad-mol text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs">{t("hints.security")}</p>
            </div>
            <div className="flex items-center gap-pad-atom text-xs">
              <MapPinned className="size-3.5" />
              {t("hints.cities")}
            </div>
          </Card>
        </div>
      )}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </AdminPageShell>
  );
}
