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
  Select,
  Tabs,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { MOCK_USERS } from "@/features/mocks/users.seed";
import { getProviderFeatures } from "@/lib/sms/capabilities";
import {
  acceptMessage,
  simulateSmsirCreditRefresh,
  updateSmsirConfig,
  useNotificationsState,
} from "@/features/notifications/mocks/store";
import type { MessageStatus, NotificationChannel } from "@/features/notifications/mocks/types";

const STATUS_OPTIONS: Array<MessageStatus | "all"> = [
  "all",
  "Accepted",
  "Scheduled",
  "Queued",
  "InProgress",
  "Delivered",
  "Failed",
  "Rejected",
];

function statusVariant(status: MessageStatus): "success" | "warning" | "danger" | "primary" | "neutral" {
  if (status === "Delivered") return "success";
  if (status === "Failed" || status === "Rejected") return "danger";
  if (status === "Scheduled" || status === "Queued" || status === "InProgress") return "warning";
  if (status === "Accepted") return "primary";
  return "neutral";
}

export function AdminNotificationsPanel() {
  const t = useTranslations("admin.notifications");
  const state = useNotificationsState();
  const [tab, setTab] = useState("logs");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState<"all" | NotificationChannel>("all");
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "all">("all");
  const [manualOnly, setManualOnly] = useState(false);
  const [recipientQ, setRecipientQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  const [sendForm, setSendForm] = useState({
    recipientUserId: MOCK_USERS[0]?.id ?? "",
    channel: "in_app" as NotificationChannel,
    templateKey: "admin.manual_notice",
    title: "",
    body: "",
    code: "",
  });

  const sources = useMemo(() => {
    const set = new Set(state.messages.map((m) => m.sourceService));
    return ["all", ...Array.from(set)];
  }, [state.messages]);

  const filtered = useMemo(() => {
    return state.messages.filter((msg) => {
      if (sourceFilter !== "all" && msg.sourceService !== sourceFilter) return false;
      if (channelFilter !== "all" && msg.channel !== channelFilter) return false;
      if (statusFilter !== "all" && msg.status !== statusFilter) return false;
      if (manualOnly && !msg.manual) return false;
      if (recipientQ.trim()) {
        const q = recipientQ.trim().toLowerCase();
        const user = MOCK_USERS.find((u) => u.id === msg.recipientUserId);
        const hay = `${msg.recipientUserId} ${user?.displayName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.messages, sourceFilter, channelFilter, statusFilter, manualOnly, recipientQ]);

  const selected = state.messages.find((m) => m.id === selectedId) ?? null;
  const smsFeatures = getProviderFeatures("smsir");

  function onSend() {
    setSendError(null);
    setSendOk(null);
    const template = state.templates.find((tpl) => tpl.key === sendForm.templateKey);
    if (!template) {
      setSendError(t("errors.template_required"));
      return;
    }
    if (!template.channels.includes(sendForm.channel)) {
      setSendError(t("errors.channel_template_mismatch"));
      return;
    }

    const params: Record<string, string> = {};
    if (template.paramKeys.includes("title")) params.title = sendForm.title;
    if (template.paramKeys.includes("body")) params.body = sendForm.body;
    if (template.paramKeys.includes("Code")) params.Code = sendForm.code || "12345";

    const result = acceptMessage({
      sourceService: "admin",
      recipientUserId: sendForm.recipientUserId,
      channel: sendForm.channel,
      templateKey: sendForm.templateKey,
      templateParams: params,
      renderedContent:
        sendForm.channel === "in_app"
          ? `${sendForm.title}: ${sendForm.body}`.trim()
          : null,
      manual: true,
      priority: "normal",
    });

    if (!result.ok) {
      setSendError(t(`errors.${result.error}`));
      return;
    }
    setSendOk(t("send.accepted", { id: result.id }));
    setTab("logs");
    setSelectedId(result.id);
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <Alert variant="info">{t("mockBanner")}</Alert>

      <Tabs
        className="mt-mol"
        variant="pills"
        active={tab}
        onChange={setTab}
        items={[
          { key: "logs", label: t("tabs.logs") },
          { key: "send", label: t("tabs.send") },
          { key: "smsir", label: t("tabs.smsir") },
        ]}
      />

      {tab === "logs" ? (
        <div className="mt-mol grid gap-mol">
          <div className="grid gap-mol md:grid-cols-4">
            <Select
              label={t("filters.source")}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={sources.map((value) => ({
                value,
                label: value === "all" ? t("filters.all") : value,
              }))}
            />
            <Select
              label={t("filters.channel")}
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as "all" | NotificationChannel)}
              options={[
                { value: "all", label: t("filters.all") },
                { value: "in_app", label: t("channels.in_app") },
                { value: "sms", label: t("channels.sms") },
              ]}
            />
            <Select
              label={t("filters.status")}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as MessageStatus | "all")}
              options={STATUS_OPTIONS.map((value) => ({
                value,
                label: value === "all" ? t("filters.all") : t(`status.${value}`),
              }))}
            />
            <Input
              label={t("filters.recipient")}
              value={recipientQ}
              onChange={(e) => setRecipientQ(e.target.value)}
              placeholder={t("filters.recipientPlaceholder")}
            />
          </div>
          <label className="flex items-center gap-pad-atom text-sm">
            <input
              type="checkbox"
              checked={manualOnly}
              onChange={(e) => setManualOnly(e.target.checked)}
            />
            {t("filters.manualOnly")}
          </label>

          {filtered.length === 0 ? (
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/25">
              <Table>
                <TableHead>
                  <Tr>
                    <Th>{t("columns.id")}</Th>
                    <Th>{t("columns.source")}</Th>
                    <Th>{t("columns.channel")}</Th>
                    <Th>{t("columns.recipient")}</Th>
                    <Th>{t("columns.template")}</Th>
                    <Th>{t("columns.status")}</Th>
                    <Th>{t("columns.actions")}</Th>
                  </Tr>
                </TableHead>
                <TableBody>
                  {filtered.map((msg) => {
                    const user = MOCK_USERS.find((u) => u.id === msg.recipientUserId);
                    return (
                      <Tr key={msg.id}>
                        <Td className="font-mono text-xs">{msg.id}</Td>
                        <Td>
                          {msg.sourceService}
                          {msg.manual ? (
                            <Badge variant="secondary" className="ms-atom">
                              {t("manual")}
                            </Badge>
                          ) : null}
                        </Td>
                        <Td>{t(`channels.${msg.channel}`)}</Td>
                        <Td>{user?.displayName ?? msg.recipientUserId}</Td>
                        <Td className="text-xs">{msg.templateKey}</Td>
                        <Td>
                          <Badge variant={statusVariant(msg.status)}>{t(`status.${msg.status}`)}</Badge>
                        </Td>
                        <Td>
                          <Button size="sm" variant="outline" onClick={() => setSelectedId(msg.id)}>
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

          {selected ? (
            <Card className="p-pad-mol">
              <h3 className="text-sm font-semibold">{t("detail.title")}</h3>
              <dl className="mt-mol grid gap-atom-md text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">{t("detail.source")}</dt>
                  <dd>{selected.sourceService}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t("detail.correlation")}</dt>
                  <dd>{selected.correlationRef ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t("detail.params")}</dt>
                  <dd className="font-mono text-xs">{JSON.stringify(selected.templateParams)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t("detail.providerRef")}</dt>
                  <dd>{selected.providerReference ?? "—"}</dd>
                </div>
                {selected.errorMessage ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted">{t("detail.error")}</dt>
                    <dd className="text-danger">
                      [{selected.errorCategory}] {selected.errorMessage}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <ol className="mt-mol grid gap-atom-md text-sm">
                {selected.statusHistory.map((row, index) => (
                  <li key={`${row.at}-${index}`}>
                    <Badge variant={statusVariant(row.status)}>{t(`status.${row.status}`)}</Badge>
                    <span className="ms-atom text-xs text-muted">
                      {new Date(row.at).toLocaleString("fa-IR")}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "send" ? (
        <div className="mt-mol grid max-w-xl gap-mol">
          {sendError ? <Alert variant="danger">{sendError}</Alert> : null}
          {sendOk ? <Alert variant="success">{sendOk}</Alert> : null}
          <Select
            label={t("send.recipient")}
            value={sendForm.recipientUserId}
            onChange={(e) => setSendForm((f) => ({ ...f, recipientUserId: e.target.value }))}
            options={MOCK_USERS.map((user) => ({
              value: user.id,
              label: `${user.displayName}${user.mobile ? "" : ` (${t("send.noMobile")})`}${user.active ? "" : ` (${t("send.disabled")})`}`,
            }))}
          />
          <Select
            label={t("send.channel")}
            value={sendForm.channel}
            onChange={(e) =>
              setSendForm((f) => ({ ...f, channel: e.target.value as NotificationChannel }))
            }
            options={[
              { value: "in_app", label: t("channels.in_app") },
              { value: "sms", label: t("channels.sms") },
            ]}
          />
          <Select
            label={t("send.template")}
            value={sendForm.templateKey}
            onChange={(e) => setSendForm((f) => ({ ...f, templateKey: e.target.value }))}
            options={state.templates.map((tpl) => ({
              value: tpl.key,
              label: `${tpl.label} (${tpl.key})`,
            }))}
          />
          <Input
            label={t("send.title")}
            value={sendForm.title}
            onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Input
            label={t("send.body")}
            value={sendForm.body}
            onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
          />
          <Input
            label={t("send.code")}
            value={sendForm.code}
            onChange={(e) => setSendForm((f) => ({ ...f, code: e.target.value }))}
            hint={t("send.codeHint")}
          />
          <Button onClick={onSend}>{t("send.submit")}</Button>
        </div>
      ) : null}

      {tab === "smsir" ? (
        <div className="mt-mol grid gap-mol">
          <Alert variant="info">{t("smsir.banner")}</Alert>
          <Card className="grid gap-mol p-pad-mol sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">{t("smsir.provider")}</p>
              <p className="font-semibold">sms.ir</p>
            </div>
            <div>
              <p className="text-xs text-muted">{t("smsir.apiKey")}</p>
              <p className="font-mono text-sm">
                {state.smsir.apiKeySet ? state.smsir.apiKeyMasked : t("smsir.apiKeyMissing")}
              </p>
            </div>
            <Input
              label={t("smsir.lineNumber")}
              value={state.smsir.lineNumber}
              onChange={(e) => updateSmsirConfig({ lineNumber: e.target.value })}
            />
            <Input
              label={t("smsir.verifyTemplateId")}
              value={state.smsir.verifyTemplateId}
              onChange={(e) => updateSmsirConfig({ verifyTemplateId: e.target.value })}
            />
            <div>
              <p className="text-xs text-muted">{t("smsir.credit")}</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat("fa-IR").format(state.smsir.credit)}
              </p>
              <Button size="sm" variant="outline" className="mt-atom-md" onClick={simulateSmsirCreditRefresh}>
                {t("smsir.refreshCredit")}
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted">{t("smsir.lines")}</p>
              <ul className="mt-atom text-sm font-mono">
                {state.smsir.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold">{t("smsir.capabilities")}</h3>
            <p className="mt-atom text-xs text-muted">{t("smsir.capabilitiesHint")}</p>
            <div className="mt-mol flex flex-wrap gap-pad-atom">
              {smsFeatures.map((feature) => (
                <Badge key={feature.id} variant={feature.supported ? "success" : "neutral"}>
                  {feature.id}
                  {feature.supported ? "" : ` · ${t("smsir.unsupported")}`}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
