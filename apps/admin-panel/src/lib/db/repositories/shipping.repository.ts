import { prisma } from "@/lib/db/prisma";
import { getShippingProviderFeatures } from "@/lib/shipping/capabilities";
import { createShippingProvider } from "@/lib/shipping/factory";
import { parseTipaxConfig } from "@/lib/shipping/providers/tipax/client";
import type {
  ShippingAction,
  ShippingInvokeResult,
  ShippingProvider,
  ShippingProviderCode,
} from "@/lib/shipping/types";

type ShippingProviderRow = {
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

function isMasked(value: unknown): boolean {
  const s = String(value ?? "");
  return !s || s.includes("*");
}

export function maskShippingProviderConfig(
  code: ShippingProviderCode,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (code !== "tipax") return { ...config };

  const parsed = parseTipaxConfig(config);
  return {
    ...parsed,
    apiKey: maskSecret(parsed.apiKey),
    password: maskSecret(parsed.password),
    accessToken: parsed.accessToken ? maskSecret(parsed.accessToken) : "",
    refreshToken: parsed.refreshToken ? maskSecret(parsed.refreshToken) : "",
    apiKeySet: Boolean(parsed.apiKey),
    passwordSet: Boolean(parsed.password),
    usernameSet: Boolean(parsed.username),
    tokenSet: Boolean(parsed.accessToken),
    hasRefreshToken: Boolean(parsed.refreshToken),
  };
}

export function mergeShippingProviderConfig(
  code: ShippingProviderCode,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current, ...patch };
  if (code === "tipax") {
    for (const key of ["apiKey", "password", "accessToken", "refreshToken"] as const) {
      if (isMasked(patch[key])) {
        next[key] = current[key] ?? "";
      }
    }
  }
  return next;
}

export async function listShippingProviders() {
  return prisma.$queryRaw<ShippingProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM shipping_providers
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, name ASC
  `;
}

export async function getShippingProviderById(id: string) {
  const rows = await prisma.$queryRaw<ShippingProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM shipping_providers
    WHERE id = ${id}::uuid AND deleted_at IS NULL
  `;
  return rows[0] ?? null;
}

export async function getEnabledShippingProvider() {
  const rows = await prisma.$queryRaw<ShippingProviderRow[]>`
    SELECT id, code::text AS code, name, description, is_active, is_enabled,
           config, sort_order, created_at, updated_at
    FROM shipping_providers
    WHERE deleted_at IS NULL
      AND is_active = true
      AND is_enabled = true
    ORDER BY sort_order ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function updateShippingProvider(
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
  const existing = await getShippingProviderById(id);
  if (!existing) return null;

  if (data.isEnabled === true) {
    await prisma.$executeRaw`
      UPDATE shipping_providers
      SET is_enabled = false, updated_at = now()
      WHERE deleted_at IS NULL AND id <> ${id}::uuid
    `;
  }

  if (data.isActive !== undefined) {
    await prisma.$executeRaw`
      UPDATE shipping_providers SET is_active = ${data.isActive}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.isEnabled !== undefined) {
    await prisma.$executeRaw`
      UPDATE shipping_providers SET is_enabled = ${data.isEnabled}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.sortOrder !== undefined) {
    await prisma.$executeRaw`
      UPDATE shipping_providers SET sort_order = ${data.sortOrder}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.name !== undefined) {
    await prisma.$executeRaw`
      UPDATE shipping_providers SET name = ${data.name}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.description !== undefined) {
    await prisma.$executeRaw`
      UPDATE shipping_providers SET description = ${data.description}, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }
  if (data.config !== undefined) {
    const merged = mergeShippingProviderConfig(
      existing.code as ShippingProviderCode,
      asConfig(existing.config),
      data.config,
    );
    await prisma.$executeRaw`
      UPDATE shipping_providers
      SET config = ${JSON.stringify(merged)}::jsonb, updated_at = now()
      WHERE id = ${id}::uuid
    `;
  }

  return getShippingProviderById(id);
}

export async function persistShippingProviderTokens(
  id: string,
  tokens: { accessToken: string; refreshToken: string; expiresAt: string | null },
) {
  const existing = await getShippingProviderById(id);
  if (!existing) return null;
  const config = {
    ...asConfig(existing.config),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
  await prisma.$executeRaw`
    UPDATE shipping_providers
    SET config = ${JSON.stringify(config)}::jsonb, updated_at = now()
    WHERE id = ${id}::uuid
  `;
  return getShippingProviderById(id);
}

export function mapShippingProvider(row: ShippingProviderRow) {
  const code = row.code as ShippingProviderCode;
  const config = asConfig(row.config);
  return {
    id: row.id,
    code,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isEnabled: row.is_enabled,
    config: maskShippingProviderConfig(code, config),
    features: getShippingProviderFeatures(code),
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function instantiateShippingProvider(row: ShippingProviderRow): ShippingProvider {
  const code = row.code as ShippingProviderCode;
  return createShippingProvider(code, asConfig(row.config), async (tokens) => {
    await persistShippingProviderTokens(row.id, tokens);
  });
}

export async function logShippingAction(input: {
  providerCode: ShippingProviderCode;
  action: string;
  externalId?: string | null;
  trackingCode?: string | null;
  status?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string | null;
}) {
  await prisma.$executeRaw`
    INSERT INTO shipping_shipment_logs (
      provider_code, action, external_id, tracking_code, status,
      request_payload, response_payload, error_message
    )
    VALUES (
      ${input.providerCode}::shipping_provider_code,
      ${input.action},
      ${input.externalId ?? null},
      ${input.trackingCode ?? null},
      ${input.status ?? "submitted"},
      ${JSON.stringify(input.requestPayload ?? null)}::jsonb,
      ${JSON.stringify(input.responsePayload ?? null)}::jsonb,
      ${input.errorMessage ?? null}
    )
  `;
}

export async function invokeShippingProviderAction(
  id: string,
  action: ShippingAction,
  payload: Record<string, unknown> = {},
): Promise<ShippingInvokeResult> {
  const row = await getShippingProviderById(id);
  if (!row) {
    return { success: false, errorMessage: "Shipping provider not found" };
  }
  if (!row.is_active) {
    return { success: false, errorMessage: "Provider is inactive" };
  }

  const provider = instantiateShippingProvider(row);
  const result = await provider.invoke(action, payload);

  await logShippingAction({
    providerCode: row.code as ShippingProviderCode,
    action,
    status: result.success ? "submitted" : "failed",
    requestPayload: { action, payload },
    responsePayload: result.data ?? result,
    errorMessage: result.errorMessage ?? null,
    externalId:
      result.data && typeof result.data === "object"
        ? String((result.data as Record<string, unknown>).orderId ?? "") || null
        : null,
    trackingCode:
      result.data && typeof result.data === "object"
        ? String(
            (result.data as Record<string, unknown>).trackingCode ??
              (result.data as Record<string, unknown>).trackingInput ??
              "",
          ) || null
        : null,
  });

  return result;
}
