"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  KeyRound,
  MessageSquare,
  Radio,
  ShieldAlert,
  Sparkles,
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
import { useInvokeSmsProvider, useSmsProviders, useUpdateSmsProvider } from "@/features/sms/queries";
import { handleApiError } from "@/lib/api/client";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";
import type { SmsFeatureId, SmsProviderDto } from "@/types/domain";

type ToolTab =
  | "overview"
  | "config"
  | "verify"
  | "bulk"
  | "reports"
  | "receive"
  | "account";

const FEATURE_ORDER: SmsFeatureId[] = [
  "verify",
  "bulk",
  "likeToLike",
  "scheduled",
  "cancelScheduled",
  "messageStatus",
  "packReports",
  "liveReports",
  "archiveReports",
  "receive",
  "credit",
  "lines",
  "sandbox",
];

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-white/40 bg-black/5 p-pad-mol text-xs leading-relaxed text-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ProviderConfigForm({
  provider,
  onSaved,
}: {
  provider: SmsProviderDto;
  onSaved?: () => void;
}) {
  const t = useTranslations("admin.smsProviders");
  const updateProvider = useUpdateSmsProvider();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [verifyTemplateId, setVerifyTemplateId] = useState("");
  const [otpParamName, setOtpParamName] = useState("CODE");
  const [sandbox, setSandbox] = useState(true);

  useEffect(() => {
    const cfg = provider.config ?? {};
    setApiKey("");
    setLineNumber(String(cfg.lineNumber ?? ""));
    setVerifyTemplateId(String(cfg.verifyTemplateId || (cfg.sandbox ? "123456" : "")));
    setOtpParamName(String(cfg.otpParamName ?? "CODE"));
    setSandbox(Boolean(cfg.sandbox ?? true));
    setError(null);
    setSuccess(false);
  }, [provider.id, provider.updatedAt]);

  if (provider.code !== "smsir") {
    return (
      <div className="rounded-xl border border-white/45 bg-white/35 p-pad-mol text-sm text-muted">
        {t("config.consoleOnly")}
      </div>
    );
  }

  async function onSave() {
    setError(null);
    setSuccess(false);
    try {
      const nextKey = apiKey.trim();
      await updateProvider.mutateAsync({
        id: provider.id,
        input: {
          config: {
            apiKey: nextKey || undefined,
            lineNumber,
            verifyTemplateId: verifyTemplateId || (sandbox ? "123456" : ""),
            otpParamName: otpParamName || "CODE",
            sandbox,
          },
        },
      });
      setApiKey("");
      setSuccess(true);
      onSaved?.();
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

      {provider.config.apiKeySet ? (
        <p className="text-xs text-muted">
          {t("config.apiKeyMasked", { masked: String(provider.config.apiKey ?? "") })}
        </p>
      ) : (
        <Alert variant="warning">{t("config.apiKeyMissing")}</Alert>
      )}

      <div className="grid gap-mol sm:grid-cols-2">
        <Input
          label={t("config.lineNumber")}
          value={lineNumber}
          onChange={(e) => setLineNumber(e.target.value)}
        />
        <Input
          label={t("config.verifyTemplateId")}
          value={verifyTemplateId}
          placeholder={sandbox ? "123456" : undefined}
          onChange={(e) => setVerifyTemplateId(e.target.value)}
        />
      </div>

      <Input
        label={t("config.otpParamName")}
        value={otpParamName}
        onChange={(e) => setOtpParamName(e.target.value)}
      />

      <div className="flex items-center justify-between rounded-xl border border-white/45 bg-white/40 px-pad-mol py-pad-mol">
        <div>
          <p className="text-sm font-medium">{t("config.sandbox")}</p>
          <p className="text-xs text-muted">{t("config.sandboxHint")}</p>
        </div>
        <Toggle
          checked={sandbox}
          onChange={(checked) => {
            setSandbox(checked);
            if (checked && !verifyTemplateId) setVerifyTemplateId("123456");
          }}
        />
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{t("config.saved")}</Alert> : null}

      <div className="flex justify-end">
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
  provider: SmsProviderDto;
  initialTab?: ToolTab;
}) {
  const t = useTranslations("admin.smsProviders");
  const invoke = useInvokeSmsProvider();
  const [tab, setTab] = useState<ToolTab>(initialTab);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("123456");
  const [messageText, setMessageText] = useState("");
  const [messageId, setMessageId] = useState("");
  const [packId, setPackId] = useState("");

  useEffect(() => {
    setTab(initialTab);
    setResult(null);
    setError(null);
  }, [provider.id, initialTab]);

  async function run(
    action: Parameters<typeof invoke.mutateAsync>[0]["input"]["action"],
    payload?: Record<string, unknown>,
  ) {
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

  const tabs = [
    { key: "overview", label: t("tools.tabs.overview") },
    { key: "config", label: t("tools.tabs.config") },
    {
      key: "verify",
      label: t("tools.tabs.verify"),
      disabled: !provider.features.find((f) => f.id === "verify")?.supported,
    },
    {
      key: "bulk",
      label: t("tools.tabs.bulk"),
      disabled: !provider.features.find((f) => f.id === "bulk")?.supported,
    },
    {
      key: "reports",
      label: t("tools.tabs.reports"),
      disabled: !provider.features.find((f) => f.id === "messageStatus")?.supported,
    },
    {
      key: "receive",
      label: t("tools.tabs.receive"),
      disabled: !provider.features.find((f) => f.id === "receive")?.supported,
    },
    {
      key: "account",
      label: t("tools.tabs.account"),
      disabled: !(
        provider.features.find((f) => f.id === "credit")?.supported ||
        provider.features.find((f) => f.id === "lines")?.supported
      ),
    },
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
            {provider.code === "smsir" ? (
              <p className="mt-pad-atom text-xs">
                {provider.config.apiKeySet ? t("config.keyReady") : t("config.apiKeyMissing")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "config" ? <ProviderConfigForm provider={provider} /> : null}

      {tab === "verify" ? (
        <div className="flex flex-col gap-mol">
          <Input label={t("tools.fields.mobile")} value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input label={t("tools.fields.code")} value={code} onChange={(e) => setCode(e.target.value)} />
          <Button loading={invoke.isPending} onClick={() => run("sendVerify", { mobile, code })}>
            {t("tools.actions.sendVerify")}
          </Button>
        </div>
      ) : null}

      {tab === "bulk" ? (
        <div className="flex flex-col gap-mol">
          <Input label={t("tools.fields.mobile")} value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input
            label={t("tools.fields.messageText")}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />
          <div className="flex flex-wrap gap-pad-atom">
            <Button
              loading={invoke.isPending}
              onClick={() =>
                run("sendBulk", {
                  mobile,
                  mobiles: [mobile],
                  messageText,
                })
              }
            >
              {t("tools.actions.sendBulk")}
            </Button>
            <Button
              variant="secondary"
              loading={invoke.isPending}
              onClick={() =>
                run("sendLikeToLike", {
                  mobiles: [mobile],
                  messageTexts: [messageText],
                })
              }
            >
              {t("tools.actions.sendLikeToLike")}
            </Button>
            <Button
              variant="ghost"
              loading={invoke.isPending}
              onClick={() => run("cancelScheduled", { packId })}
            >
              {t("tools.actions.cancelScheduled")}
            </Button>
          </div>
          <Input
            label={t("tools.fields.packId")}
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          />
        </div>
      ) : null}

      {tab === "reports" ? (
        <div className="flex flex-col gap-mol">
          <Input
            label={t("tools.fields.messageId")}
            value={messageId}
            onChange={(e) => setMessageId(e.target.value)}
          />
          <Input
            label={t("tools.fields.packId")}
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          />
          <div className="flex flex-wrap gap-pad-atom">
            <Button loading={invoke.isPending} onClick={() => run("getMessageStatus", { messageId })}>
              {t("tools.actions.messageStatus")}
            </Button>
            <Button loading={invoke.isPending} variant="secondary" onClick={() => run("listTodayPacks")}>
              {t("tools.actions.todayPacks")}
            </Button>
            <Button
              loading={invoke.isPending}
              variant="secondary"
              onClick={() => run("getPackMessages", { packId })}
            >
              {t("tools.actions.packMessages")}
            </Button>
            <Button loading={invoke.isPending} variant="ghost" onClick={() => run("listLiveMessages")}>
              {t("tools.actions.liveMessages")}
            </Button>
            <Button loading={invoke.isPending} variant="ghost" onClick={() => run("listArchiveMessages")}>
              {t("tools.actions.archiveMessages")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "receive" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("listLatestReceived", { count: 50 })}>
            {t("tools.actions.latestReceived")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("listLiveReceived")}>
            {t("tools.actions.liveReceived")}
          </Button>
          <Button loading={invoke.isPending} variant="ghost" onClick={() => run("listArchiveReceived")}>
            {t("tools.actions.archiveReceived")}
          </Button>
        </div>
      ) : null}

      {tab === "account" ? (
        <div className="flex flex-wrap gap-pad-atom">
          <Button loading={invoke.isPending} onClick={() => run("getCredit")}>
            {t("tools.actions.credit")}
          </Button>
          <Button loading={invoke.isPending} variant="secondary" onClick={() => run("getLines")}>
            {t("tools.actions.lines")}
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
  providers: SmsProviderDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleEnabled: (provider: SmsProviderDto, enabled: boolean) => void;
  onToggleActive: (provider: SmsProviderDto, active: boolean) => void;
  onConfigure: (provider: SmsProviderDto) => void;
  updating: boolean;
}) {
  const t = useTranslations("admin.smsProviders");
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t("slider.prev")}
            onClick={() => scrollByCard(-1)}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t("slider.next")}
            onClick={() => scrollByCard(1)}
          >
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
                <div className="flex items-start justify-between gap-pad-atom">
                  <div className="space-y-pad-atom">
                    <div className="flex flex-wrap items-center gap-pad-atom">
                      <h3 className="text-base font-semibold">{provider.name}</h3>
                      <Badge variant="neutral">{provider.code}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-pad-atom">
                      {provider.isEnabled ? (
                        <Badge variant="success">
                          <span className="inline-flex items-center gap-1">
                            <Radio className="size-3" />
                            {t("status.primary")}
                          </span>
                        </Badge>
                      ) : null}
                      {!provider.isActive ? (
                        <Badge variant="warning">{t("status.inactive")}</Badge>
                      ) : null}
                      {provider.code === "smsir" && provider.config.apiKeySet ? (
                        <Badge variant="primary">{t("config.keyReady")}</Badge>
                      ) : null}
                      {provider.code === "smsir" && !provider.config.apiKeySet ? (
                        <Badge variant="warning">{t("config.needsKey")}</Badge>
                      ) : null}
                    </div>
                  </div>
                  {provider.code === "console" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Sparkles className="size-3.5" />
                      {t("status.dev")}
                    </span>
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
                  {provider.code === "smsir" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => onConfigure(provider)}
                    >
                      <KeyRound className="size-3.5" />
                      {t("actions.setApiKey")}
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

export function AdminSmsProvidersPanel() {
  const t = useTranslations("admin.smsProviders");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "settings.manage", authUser.role);
  const { data, isLoading, isError } = useSmsProviders();
  const updateProvider = useUpdateSmsProvider();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toolsTab, setToolsTab] = useState<ToolTab>("overview");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => data?.find((p) => p.id === selectedId) ?? data?.find((p) => p.isEnabled) ?? data?.[0] ?? null,
    [data, selectedId],
  );

  async function toggleEnabled(provider: SmsProviderDto, enabled: boolean) {
    setError(null);
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        input: { isEnabled: enabled },
      });
      setSelectedId(provider.id);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function toggleActive(provider: SmsProviderDto, active: boolean) {
    setError(null);
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        input: { isActive: active },
      });
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
            <MessageSquare className="size-5" />
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

          {selected ? <ProviderTools key={selected.id} provider={selected} initialTab={toolsTab} /> : null}

          <Card className="flex flex-col gap-pad-mol text-sm text-muted">
            <div className="flex items-center gap-pad-atom text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">{t("hints.title")}</span>
            </div>
            <ul className="list-disc space-y-pad-atom pr-pad-mol">
              <li>{t("hints.onePrimary")}</li>
              <li>{t("hints.consoleDev")}</li>
              <li>{t("hints.smsirConfig")}</li>
            </ul>
            <div className="flex items-start gap-pad-atom rounded-xl border border-amber-500/20 bg-amber-500/10 p-pad-mol text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs">{t("hints.security")}</p>
            </div>
            <div className="flex items-center gap-pad-atom text-xs">
              <CreditCard className="size-3.5" />
              {t("hints.billing")}
            </div>
          </Card>
        </div>
      )}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </AdminPageShell>
  );
}
