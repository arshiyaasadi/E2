"use client";

import { createMockStore, newId, useMockStore } from "@/features/mocks/create-store";
import { MOCK_ADMIN_ID } from "@/features/mocks/users.seed";
import { emitPaymentInAppNotification } from "@/features/notifications/mocks/store";
import { PAYMENTS_SEED, PLACEHOLDER_RECEIPT } from "./seed";
import type {
  MockDeposit,
  MockPaymentAccount,
  PaymentsMockState,
} from "./types";

const store = createMockStore<PaymentsMockState>(PAYMENTS_SEED);

function nowIso() {
  return new Date().toISOString();
}

function activeAttempt(deposit: MockDeposit) {
  return [...deposit.attempts].reverse().find((a) => a.status === "Submitted") ?? null;
}

export type AccountInput = {
  holderName: string;
  cardNumber: string | null;
  iban: string | null;
  bankName: string | null;
  label: string | null;
  isActive: boolean;
  isDefault: boolean;
};

export function upsertPaymentAccount(
  input: AccountInput,
  accountId?: string,
): { ok: true; id: string } | { ok: false; error: string } {
  const holderName = input.holderName.trim();
  if (!holderName) return { ok: false, error: "holder_required" };
  if (!input.cardNumber?.trim() && !input.iban?.trim()) {
    return { ok: false, error: "card_or_iban_required" };
  }

  const id = accountId ?? newId("acc");

  store.setState((prev) => {
    let accounts = [...prev.accounts];

    if (accountId) {
      accounts = accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              holderName,
              cardNumber: input.cardNumber?.trim() || null,
              iban: input.iban?.trim() || null,
              bankName: input.bankName?.trim() || null,
              label: input.label?.trim() || null,
              isActive: input.isActive,
              isDefault: input.isDefault,
            }
          : acc,
      );
    } else {
      accounts.push({
        id,
        holderName,
        cardNumber: input.cardNumber?.trim() || null,
        iban: input.iban?.trim() || null,
        bankName: input.bankName?.trim() || null,
        label: input.label?.trim() || null,
        isActive: input.isActive,
        isDefault: input.isDefault,
        createdAt: nowIso(),
      });
    }

    if (input.isDefault) {
      accounts = accounts.map((acc) => ({
        ...acc,
        isDefault: acc.id === id,
        isActive: acc.id === id ? true : acc.isActive,
      }));
    }

    const defaults = accounts.filter((acc) => acc.isDefault && acc.isActive);
    if (defaults.length === 0) {
      const firstActive = accounts.find((acc) => acc.isActive) ?? accounts[0];
      if (firstActive) {
        accounts = accounts.map((acc) => ({
          ...acc,
          isDefault: acc.id === firstActive.id,
          isActive: acc.id === firstActive.id ? true : acc.isActive,
        }));
      }
    }

    return { ...prev, accounts };
  });

  return { ok: true, id };
}

export function deactivatePaymentAccount(accountId: string): { ok: true } | { ok: false; error: string } {
  const state = store.getState();
  const target = state.accounts.find((a) => a.id === accountId);
  if (!target) return { ok: false, error: "not_found" };
  if (target.isDefault) {
    const otherDefault = state.accounts.find((a) => a.id !== accountId && a.isActive);
    if (!otherDefault) return { ok: false, error: "need_another_default" };
  }

  store.setState((prev) => ({
    ...prev,
    accounts: prev.accounts.map((acc) => {
      if (acc.id !== accountId) return acc;
      return { ...acc, isActive: false, isDefault: false };
    }),
  }));

  const after = store.getState();
  if (!after.accounts.some((a) => a.isDefault && a.isActive)) {
    const next = after.accounts.find((a) => a.isActive);
    if (next) {
      store.setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((acc) => ({
          ...acc,
          isDefault: acc.id === next.id,
        })),
      }));
    }
  }

  return { ok: true };
}

export function setDefaultPaymentAccount(accountId: string): { ok: true } | { ok: false; error: string } {
  const target = store.getState().accounts.find((a) => a.id === accountId);
  if (!target) return { ok: false, error: "not_found" };
  if (!target.isActive) return { ok: false, error: "inactive" };

  store.setState((prev) => ({
    ...prev,
    accounts: prev.accounts.map((acc) => ({
      ...acc,
      isDefault: acc.id === accountId,
    })),
  }));
  return { ok: true };
}

export function approveDeposit(depositId: string): { ok: true } | { ok: false; error: string } {
  const deposit = store.getState().deposits.find((d) => d.id === depositId);
  if (!deposit) return { ok: false, error: "not_found" };
  if (deposit.status !== "AwaitingReceiptReview") return { ok: false, error: "invalid_status" };

  const attempt = activeAttempt(deposit);
  if (!attempt) return { ok: false, error: "no_attempt" };
  if (attempt.paidAmount !== deposit.finalAmount) return { ok: false, error: "amount_mismatch" };

  const at = nowIso();
  store.setState((prev) => ({
    ...prev,
    deposits: prev.deposits.map((d) => {
      if (d.id !== depositId) return d;
      return {
        ...d,
        status: "Approved" as const,
        updatedAt: at,
        attempts: d.attempts.map((a) =>
          a.id === attempt.id
            ? {
                ...a,
                status: "Approved" as const,
                reviewedAt: at,
                reviewedBy: MOCK_ADMIN_ID,
              }
            : a,
        ),
        history: [
          ...d.history,
          {
            id: newId("ev"),
            action: "approve" as const,
            at,
            by: MOCK_ADMIN_ID,
            reason: null,
          },
        ],
      };
    }),
  }));

  emitPaymentInAppNotification({
    kind: "approved",
    userId: deposit.userId,
    invoiceNumber: deposit.invoiceNumber,
    amount: deposit.finalAmount,
  });

  return { ok: true };
}

export function rejectDeposit(
  depositId: string,
  reason: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "reason_required" };

  const deposit = store.getState().deposits.find((d) => d.id === depositId);
  if (!deposit) return { ok: false, error: "not_found" };
  if (deposit.status !== "AwaitingReceiptReview") return { ok: false, error: "invalid_status" };

  const attempt = activeAttempt(deposit);
  if (!attempt) return { ok: false, error: "no_attempt" };

  const at = nowIso();
  store.setState((prev) => ({
    ...prev,
    deposits: prev.deposits.map((d) => {
      if (d.id !== depositId) return d;
      return {
        ...d,
        status: "NeedsCorrection" as const,
        updatedAt: at,
        attempts: d.attempts.map((a) =>
          a.id === attempt.id
            ? {
                ...a,
                status: "Rejected" as const,
                rejectionReason: trimmed,
                reviewedAt: at,
                reviewedBy: MOCK_ADMIN_ID,
              }
            : a,
        ),
        history: [
          ...d.history,
          {
            id: newId("ev"),
            action: "reject" as const,
            at,
            by: MOCK_ADMIN_ID,
            reason: trimmed,
          },
        ],
      };
    }),
  }));

  emitPaymentInAppNotification({
    kind: "rejected",
    userId: deposit.userId,
    invoiceNumber: deposit.invoiceNumber,
    reason: trimmed,
  });

  return { ok: true };
}

/** Simulate customer resubmitting a new receipt after NeedsCorrection. */
export function mockResubmitReceipt(depositId: string): { ok: true } | { ok: false; error: string } {
  const deposit = store.getState().deposits.find((d) => d.id === depositId);
  if (!deposit) return { ok: false, error: "not_found" };
  if (deposit.status !== "NeedsCorrection") return { ok: false, error: "invalid_status" };

  const at = nowIso();
  store.setState((prev) => ({
    ...prev,
    deposits: prev.deposits.map((d) => {
      if (d.id !== depositId) return d;
      return {
        ...d,
        status: "AwaitingReceiptReview" as const,
        updatedAt: at,
        attempts: [
          ...d.attempts,
          {
            id: newId("att"),
            status: "Submitted" as const,
            mediaUrl: PLACEHOLDER_RECEIPT,
            paidAmount: d.finalAmount,
            transferNote: "رسید جدید (فیک)",
            payerName: null,
            submittedAt: at,
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        ],
        history: [
          ...d.history,
          {
            id: newId("ev"),
            action: "resubmit" as const,
            at,
            by: d.userId,
            reason: null,
          },
        ],
      };
    }),
  }));

  return { ok: true };
}

/** Simulate first receipt upload from AwaitingPayment. */
export function mockSubmitReceipt(depositId: string): { ok: true } | { ok: false; error: string } {
  const deposit = store.getState().deposits.find((d) => d.id === depositId);
  if (!deposit) return { ok: false, error: "not_found" };
  if (deposit.status !== "AwaitingPayment") return { ok: false, error: "invalid_status" };

  const at = nowIso();
  store.setState((prev) => ({
    ...prev,
    deposits: prev.deposits.map((d) => {
      if (d.id !== depositId) return d;
      return {
        ...d,
        status: "AwaitingReceiptReview" as const,
        updatedAt: at,
        attempts: [
          {
            id: newId("att"),
            status: "Submitted" as const,
            mediaUrl: PLACEHOLDER_RECEIPT,
            paidAmount: d.finalAmount,
            transferNote: "اولین رسید (فیک)",
            payerName: null,
            submittedAt: at,
            rejectionReason: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        ],
        history: [
          ...d.history,
          {
            id: newId("ev"),
            action: "resubmit" as const,
            at,
            by: d.userId,
            reason: null,
          },
        ],
      };
    }),
  }));

  return { ok: true };
}

export function resetPaymentsMock() {
  store.reset();
}

export function usePaymentsState() {
  return useMockStore(store, (s) => s);
}

export function usePaymentAccounts(): MockPaymentAccount[] {
  return useMockStore(store, (s) => s.accounts);
}

export function useDeposits(): MockDeposit[] {
  return useMockStore(store, (s) => s.deposits);
}
