import { prisma } from "@/lib/db/prisma";
import { getProviderFeatures } from "@/lib/sms/capabilities";
import { createSmsProvider } from "@/lib/sms/factory";
import { parseSmsirConfig } from "@/lib/sms/providers/smsir/client";
import type { SmsProvider, SmsProviderCode } from "@/lib/sms/types";

type SmsProviderRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_enabled: boolean;
  config: unknown;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

function asConfig(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export function maskProviderConfig(
  code: SmsProviderCode,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (code === "smsir") {
    const parsed = parseSmsirConfig(config);
    return {
      ...parsed,
      apiKey: maskSecret(parsed.apiKey),
      apiKeySet: Boolean(parsed.apiKey),
    };
  }
  return { ...config };
}

export function mergeProviderConfig(
  code: SmsProviderCode,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current, ...patch };
  if (code === "smsir") {
    const apiKey = String(patch.apiKey ?? "");
    if (!apiKey || apiKey.includes("*")) {
      next.apiKey = String(current.apiKey ?? "");
    }
  }
  return next;
}

export async function listSmsProviders() {
  return prisma.$queryRaw<SmsProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM sms_providers
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, name ASC
  `;
}

export async function getSmsProviderById(id: string) {
  const rows = await prisma.$queryRaw<SmsProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM sms_providers
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function getEnabledSmsProvider() {
  const rows = await prisma.$queryRaw<SmsProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM sms_providers
    WHERE deleted_at IS NULL
      AND is_active = true
      AND is_enabled = true
    ORDER BY sort_order ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateSmsProvider(
  id: string,
  data: {
    isActive?: boolean;
    isEnabled?: boolean;
    sortOrder?: number;
    config?: Record<string, unknown>;
    name?: string;
    description?: string | null;
  },
) {
  const existing = await getSmsProviderById(id);
  if (!existing) return null;

  if (data.isEnabled === true) {
    await prisma.$executeRaw`
      UPDATE sms_providers
      SET is_enabled = false, updated_at = now()
      WHERE deleted_at IS NULL AND id <> ${id}::uuid
    `;
  }

  if (data.isActive !== undefined) {
    await prisma.$executeRaw`
      UPDATE sms_providers SET is_active = ${data.isActive}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.isEnabled !== undefined) {
    await prisma.$executeRaw`
      UPDATE sms_providers SET is_enabled = ${data.isEnabled}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.sortOrder !== undefined) {
    await prisma.$executeRaw`
      UPDATE sms_providers SET sort_order = ${data.sortOrder}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.name !== undefined) {
    await prisma.$executeRaw`
      UPDATE sms_providers SET name = ${data.name}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.description !== undefined) {
    await prisma.$executeRaw`
      UPDATE sms_providers SET description = ${data.description}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.config !== undefined) {
    const merged = mergeProviderConfig(
      existing.code as SmsProviderCode,
      asConfig(existing.config),
      data.config,
    );
    await prisma.$executeRaw`
      UPDATE sms_providers
      SET config = ${JSON.stringify(merged)}::jsonb, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }

  return getSmsProviderById(id);
}

export function mapSmsProvider(row: SmsProviderRow, { revealSecrets = false } = {}) {
  const code = row.code as SmsProviderCode;
  const config = asConfig(row.config);
  return {
    id: row.id,
    code,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isEnabled: row.is_enabled,
    config: revealSecrets ? config : maskProviderConfig(code, config),
    features: getProviderFeatures(code),
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function instantiateProvider(row: SmsProviderRow): SmsProvider {
  return createSmsProvider(row.code as SmsProviderCode, asConfig(row.config));
}

export async function getActiveSmsClient(): Promise<{
  row: SmsProviderRow;
  provider: SmsProvider;
} | null> {
  const row = await getEnabledSmsProvider();
  if (!row) return null;
  return { row, provider: instantiateProvider(row) };
}
