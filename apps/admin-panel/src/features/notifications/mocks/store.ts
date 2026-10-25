"use client";

import { createMockStore, newId, useMockStore } from "@/features/mocks/create-store";
import { MOCK_ADMIN_ID, findMockUser } from "@/features/mocks/users.seed";
import { NOTIFICATIONS_SEED } from "./seed";
import type {
  MessageStatus,
  MockMessageLog,
  NotificationChannel,
  NotificationsMockState,
} from "./types";

const store = createMockStore<NotificationsMockState>(NOTIFICATIONS_SEED);

function nowIso() {
  return new Date().toISOString();
}

function pushStatus(message: MockMessageLog, status: MessageStatus, at: string): MockMessageLog {
  return {
    ...message,
    status,
    statusHistory: [...message.statusHistory, { status, at }],
    executedAt: status === "Delivered" || status === "Failed" ? at : message.executedAt,
  };
}

function simulateDelivery(messageId: string) {
  const t1 = setTimeout(() => {
    store.setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) => {
        if (msg.id !== messageId || msg.status === "Failed" || msg.status === "Rejected") return msg;
        const at = nowIso();
        return pushStatus({ ...msg, status: "Queued" }, "Queued", at);
      }),
    }));
  }, 400);

  const t2 = setTimeout(() => {
    store.setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) => {
        if (msg.id !== messageId) return msg;
        if (msg.status === "Failed" || msg.status === "Rejected") return msg;
        const at = nowIso();
        return pushStatus(msg, "InProgress", at);
      }),
    }));
  }, 900);

  const t3 = setTimeout(() => {
    store.setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) => {
        if (msg.id !== messageId) return msg;
        if (msg.status === "Failed" || msg.status === "Rejected") return msg;
        const at = nowIso();
        return {
          ...pushStatus(msg, "Delivered", at),
          providerReference:
            msg.channel === "sms" ? msg.providerReference ?? `smsir_${newId("ref")}` : null,
        };
      }),
    }));
  }, 1400);

  void t1;
  void t2;
  void t3;
}

export type AcceptMessageInput = {
  sourceService: string;
  recipientUserId: string;
  channel: NotificationChannel;
  templateKey: string;
  templateParams: Record<string, string>;
  scheduledAt?: string | null;
  correlationRef?: string | null;
  manual?: boolean;
  adminId?: string | null;
  priority?: "high" | "normal" | "low";
  renderedContent?: string | null;
};

export function acceptMessage(input: AcceptMessageInput): { ok: true; id: string } | { ok: false; error: string } {
  if (!input.sourceService.trim()) return { ok: false, error: "source_required" };
  if (!input.templateKey.trim()) return { ok: false, error: "template_required" };
  if (input.channel !== "in_app" && input.channel !== "sms") {
    return { ok: false, error: "channel_unsupported" };
  }

  const user = findMockUser(input.recipientUserId);
  if (!user) {
    return { ok: false, error: "user_not_found" };
  }

  const at = nowIso();
  const id = newId("msg");
  let message: MockMessageLog = {
    id,
    sourceService: input.sourceService.trim(),
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    templateKey: input.templateKey.trim(),
    templateParams: input.templateParams,
    renderedContent: input.renderedContent ?? null,
    scheduledAt: input.scheduledAt ?? null,
    acceptedAt: at,
    executedAt: null,
    status: "Accepted",
    statusHistory: [{ status: "Accepted", at }],
    retryCount: 0,
    providerReference: null,
    correlationRef: input.correlationRef ?? null,
    manual: Boolean(input.manual),
    adminId: input.manual ? (input.adminId ?? MOCK_ADMIN_ID) : null,
    errorCategory: null,
    errorMessage: null,
    priority: input.priority ?? "normal",
  };

  if (!user.active) {
    message = {
      ...pushStatus(message, "Failed", at),
      errorCategory: "user_disabled",
      errorMessage: "حساب کاربر در SSO غیرفعال است.",
    };
    store.setState((prev) => ({ ...prev, messages: [message, ...prev.messages] }));
    return { ok: true, id };
  }

  if (input.channel === "sms" && !user.mobile) {
    message = {
      ...pushStatus(message, "Failed", at),
      errorCategory: "invalid_recipient",
      errorMessage: "کاربر موبایل ثبت‌شده ندارد.",
    };
    store.setState((prev) => ({ ...prev, messages: [message, ...prev.messages] }));
    return { ok: true, id };
  }

  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  if (scheduled && scheduled.getTime() > Date.now()) {
    message = pushStatus(message, "Scheduled", at);
    store.setState((prev) => ({ ...prev, messages: [message, ...prev.messages] }));
    return { ok: true, id };
  }

  store.setState((prev) => ({ ...prev, messages: [message, ...prev.messages] }));
  simulateDelivery(id);
  return { ok: true, id };
}

export function emitPaymentInAppNotification(opts: {
  kind: "approved" | "rejected";
  userId: string;
  invoiceNumber: string;
  amount?: number;
  reason?: string;
}) {
  if (opts.kind === "approved") {
    return acceptMessage({
      sourceService: "payment",
      recipientUserId: opts.userId,
      channel: "in_app",
      templateKey: "payment.receipt_approved",
      templateParams: {
        invoiceNumber: opts.invoiceNumber,
        amount: String(opts.amount ?? ""),
      },
      renderedContent: `رسید پرداخت فاکتور ${opts.invoiceNumber} تأیید شد.`,
      correlationRef: opts.invoiceNumber,
      priority: "high",
    });
  }

  return acceptMessage({
    sourceService: "payment",
    recipientUserId: opts.userId,
    channel: "in_app",
    templateKey: "payment.receipt_rejected",
    templateParams: {
      invoiceNumber: opts.invoiceNumber,
      reason: opts.reason ?? "",
    },
    renderedContent: `رسید فاکتور ${opts.invoiceNumber} رد شد: ${opts.reason ?? ""}`,
    correlationRef: opts.invoiceNumber,
    priority: "high",
  });
}

export function updateSmsirConfig(patch: Partial<NotificationsMockState["smsir"]>) {
  store.setState((prev) => ({
    ...prev,
    smsir: { ...prev.smsir, ...patch },
  }));
}

export function simulateSmsirCreditRefresh() {
  store.setState((prev) => ({
    ...prev,
    smsir: {
      ...prev.smsir,
      credit: Math.max(0, prev.smsir.credit - Math.floor(Math.random() * 5000)),
    },
  }));
}

export function resetNotificationsMock() {
  store.reset();
}

export function useNotificationsState() {
  return useMockStore(store, (s) => s);
}

export function useNotificationMessages() {
  return useMockStore(store, (s) => s.messages);
}
