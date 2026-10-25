import {
  isTipaxTokenValid,
  parseTipaxConfig,
  tipaxFetch,
  TipaxApiError,
} from "@/lib/shipping/providers/tipax/client";
import type { TipaxProviderConfig, TokenPersister } from "@/lib/shipping/types";

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
};

function unwrapLogin(payload: LoginResponse) {
  return {
    accessToken: payload.accessToken ?? payload.data?.accessToken ?? "",
    refreshToken: payload.refreshToken ?? payload.data?.refreshToken ?? "",
    expiresIn: payload.expiresIn ?? payload.data?.expiresIn ?? 3600,
  };
}

function expiresAtFromSeconds(expiresIn: number): string {
  return new Date(Date.now() + Math.max(60, expiresIn) * 1000).toISOString();
}

export async function obtainTipaxToken(
  config: TipaxProviderConfig,
  persist?: TokenPersister,
): Promise<TipaxProviderConfig> {
  if (!config.username || !config.password) {
    throw new TipaxApiError("نام کاربری و رمز عبور Tipax تنظیم نشده است", 400);
  }
  if (!config.apiKey) {
    throw new TipaxApiError("API Key تیپاکس تنظیم نشده است", 400);
  }

  const payload = await tipaxFetch<LoginResponse>({
    baseUrl: config.baseUrl,
    method: "POST",
    path: "/api/OM/v3/Account/token",
    body: {
      username: config.username,
      password: config.password,
      apiKey: config.apiKey,
    },
  });

  const tokens = unwrapLogin(payload);
  if (!tokens.accessToken) {
    throw new TipaxApiError("پاسخ توکن Tipax نامعتبر است", 500, payload);
  }

  const next: TipaxProviderConfig = {
    ...config,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || config.refreshToken,
    expiresAt: expiresAtFromSeconds(tokens.expiresIn),
  };

  if (persist) {
    await persist({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      expiresAt: next.expiresAt,
    });
  }

  return next;
}

export async function refreshTipaxToken(
  config: TipaxProviderConfig,
  persist?: TokenPersister,
): Promise<TipaxProviderConfig> {
  if (!config.accessToken || !config.refreshToken) {
    return obtainTipaxToken(config, persist);
  }

  try {
    const payload = await tipaxFetch<LoginResponse>({
      baseUrl: config.baseUrl,
      method: "POST",
      path: "/api/OM/v3/Account/RefreshToken",
      body: {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
      },
    });

    const tokens = unwrapLogin(payload);
    if (!tokens.accessToken) {
      return obtainTipaxToken(config, persist);
    }

    const next: TipaxProviderConfig = {
      ...config,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || config.refreshToken,
      expiresAt: expiresAtFromSeconds(tokens.expiresIn),
    };

    if (persist) {
      await persist({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expiresAt: next.expiresAt,
      });
    }

    return next;
  } catch {
    return obtainTipaxToken(config, persist);
  }
}

export async function ensureTipaxAccessToken(
  rawConfig: Record<string, unknown>,
  persist?: TokenPersister,
): Promise<TipaxProviderConfig> {
  let config = parseTipaxConfig(rawConfig);
  if (isTipaxTokenValid(config)) return config;
  if (config.refreshToken) {
    config = await refreshTipaxToken(config, persist);
    return config;
  }
  return obtainTipaxToken(config, persist);
}
