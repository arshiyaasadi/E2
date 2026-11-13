import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/config/routes";
import { serverEnv } from "@/config/env.server";
import {
  refreshAppToken,
  revokeRefreshToken,
  sessionUserFromPayload,
  verifyAccessToken,
  type SessionUser,
} from "@/lib/auth/keycloak/client";

function cookieBase() {
  const secure = serverEnv.APP_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };
}

export async function setAuthCookies(opts: {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn: number;
  rememberMe?: boolean;
}) {
  const cookieStore = await cookies();
  const accessMaxAge = opts.rememberMe
    ? 60 * 60 * 24 * 30
    : Math.max(opts.expiresIn, 60 * 60);
  const refreshMaxAge = opts.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

  cookieStore.set(AUTH_COOKIES.access, opts.accessToken, {
    ...cookieBase(),
    maxAge: accessMaxAge,
  });

  if (opts.refreshToken) {
    cookieStore.set(AUTH_COOKIES.refresh, opts.refreshToken, {
      ...cookieBase(),
      maxAge: refreshMaxAge,
    });
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const base = cookieBase();
  const refresh = cookieStore.get(AUTH_COOKIES.refresh)?.value;
  if (refresh) {
    await revokeRefreshToken(refresh);
  }
  cookieStore.set(AUTH_COOKIES.access, "", { ...base, maxAge: 0 });
  cookieStore.set(AUTH_COOKIES.refresh, "", { ...base, maxAge: 0 });
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get(AUTH_COOKIES.access)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) return sessionUserFromPayload(payload);
  }

  const refresh = cookieStore.get(AUTH_COOKIES.refresh)?.value;
  if (!refresh) return null;

  try {
    const tokens = await refreshAppToken(refresh);
    await setAuthCookies({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refresh,
      expiresIn: tokens.expiresIn,
      rememberMe: true,
    });
    return sessionUserFromPayload(tokens.payload);
  } catch {
    await clearAuthCookies();
    return null;
  }
}
