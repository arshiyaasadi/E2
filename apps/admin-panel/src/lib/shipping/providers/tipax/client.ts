import type { TipaxProviderConfig } from "@/lib/shipping/types";

export class TipaxApiError extends Error {
  readonly status: number;
  readonly raw?: unknown;

  constructor(message: string, status: number, raw?: unknown) {
    super(message);
    this.name = "TipaxApiError";
    this.status = status;
    this.raw = raw;
  }
}

export function parseTipaxConfig(config: Record<string, unknown>): TipaxProviderConfig {
  return {
    baseUrl: String(config.baseUrl || "https://omtestapi.tipax.ir").replace(/\/$/, ""),
    username: String(config.username ?? ""),
    password: String(config.password ?? ""),
    apiKey: String(config.apiKey ?? ""),
    accessToken: String(config.accessToken ?? ""),
    refreshToken: String(config.refreshToken ?? ""),
    expiresAt: config.expiresAt == null ? null : String(config.expiresAt),
    defaultOriginAddressId:
      config.defaultOriginAddressId == null || config.defaultOriginAddressId === ""
        ? null
        : Number(config.defaultOriginAddressId),
    defaultPaymentType: Number(config.defaultPaymentType ?? 10),
    defaultPickupType: Number(config.defaultPickupType ?? 10),
    defaultDistributionType: Number(config.defaultDistributionType ?? 10),
    defaultServiceId: Number(config.defaultServiceId ?? 1),
  };
}

export function isTipaxTokenValid(config: TipaxProviderConfig, skewMs = 60_000): boolean {
  if (!config.accessToken) return false;
  if (!config.expiresAt) return true;
  const expires = Date.parse(config.expiresAt);
  if (Number.isNaN(expires)) return Boolean(config.accessToken);
  return expires - skewMs > Date.now();
}

function extractMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const obj = payload as Record<string, unknown>;
  for (const key of ["message", "Message", "title", "Title", "error", "Error"]) {
    if (typeof obj[key] === "string" && obj[key]) return obj[key] as string;
  }
  if (Array.isArray(obj.errors) && obj.errors.length) {
    return obj.errors.map(String).join(", ");
  }
  return fallback;
}

export async function tipaxFetch<T = unknown>(params: {
  baseUrl: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  accessToken?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
}): Promise<T> {
  const url = new URL(`${params.baseUrl}${params.path}`);
  if (params.query) {
    for (const [key, value] of Object.entries(params.query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (params.accessToken) {
    headers.Authorization = `Bearer ${params.accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: params.method,
    headers,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
    cache: "no-store",
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new TipaxApiError(
      extractMessage(payload, `Tipax HTTP ${response.status}`),
      response.status,
      payload,
    );
  }

  return payload as T;
}
