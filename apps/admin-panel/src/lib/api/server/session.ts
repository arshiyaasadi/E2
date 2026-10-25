import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { serverEnv } from "@/config/env.server";
import { AUTH_COOKIES } from "@/config/roles";

const encoder = new TextEncoder();
const secret = encoder.encode(serverEnv.AUTH_SECRET);

/** Keycloak refresh / id token cookies (httpOnly, shared domain). */
export const KC_COOKIES = {
  refresh: "admin_kc_refresh",
  id: "admin_kc_id",
  oidcState: "admin_oidc_state",
  oidcVerifier: "admin_oidc_verifier",
} as const;

export interface SessionPayload {
  sub: string;
  email: string;
  fullName: string | null;
  role: string;
}

function cookieBase() {
  const secure = serverEnv.APP_ENV === "production";
  const domain = serverEnv.AUTH_COOKIE_DOMAIN?.trim() || undefined;
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      fullName: payload.fullName ? String(payload.fullName) : null,
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}

export async function setAuthCookies(
  token: string,
  role: string,
  opts?: { refreshToken?: string | null; idToken?: string | null },
) {
  const cookieStore = await cookies();
  const base = cookieBase();

  cookieStore.set(AUTH_COOKIES.token, token, {
    ...base,
    maxAge: 60 * 60 * 24 * 7,
  });

  // Role cookie is UX-only; middleware/API must verify admin_token JWT.
  cookieStore.set(AUTH_COOKIES.role, role, {
    ...base,
    maxAge: 60 * 60 * 24 * 7,
  });

  if (opts?.refreshToken) {
    cookieStore.set(KC_COOKIES.refresh, opts.refreshToken, {
      ...base,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  if (opts?.idToken) {
    cookieStore.set(KC_COOKIES.id, opts.idToken, {
      ...base,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function setOidcPendingCookies(state: string, verifier: string) {
  const cookieStore = await cookies();
  const base = cookieBase();
  cookieStore.set(KC_COOKIES.oidcState, state, { ...base, maxAge: 600 });
  cookieStore.set(KC_COOKIES.oidcVerifier, verifier, { ...base, maxAge: 600 });
}

export async function clearOidcPendingCookies() {
  const cookieStore = await cookies();
  const base = cookieBase();
  cookieStore.set(KC_COOKIES.oidcState, "", { ...base, maxAge: 0 });
  cookieStore.set(KC_COOKIES.oidcVerifier, "", { ...base, maxAge: 0 });
}

export async function getOidcPendingCookies(): Promise<{
  state: string | null;
  verifier: string | null;
}> {
  const cookieStore = await cookies();
  return {
    state: cookieStore.get(KC_COOKIES.oidcState)?.value ?? null,
    verifier: cookieStore.get(KC_COOKIES.oidcVerifier)?.value ?? null,
  };
}

export async function getKcRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(KC_COOKIES.refresh)?.value ?? null;
}

export async function getKcIdToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(KC_COOKIES.id)?.value ?? null;
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const base = cookieBase();
  cookieStore.set(AUTH_COOKIES.token, "", { ...base, maxAge: 0 });
  cookieStore.set(AUTH_COOKIES.role, "", { ...base, maxAge: 0 });
  cookieStore.set(KC_COOKIES.refresh, "", { ...base, maxAge: 0 });
  cookieStore.set(KC_COOKIES.id, "", { ...base, maxAge: 0 });
  cookieStore.set(KC_COOKIES.oidcState, "", { ...base, maxAge: 0 });
  cookieStore.set(KC_COOKIES.oidcVerifier, "", { ...base, maxAge: 0 });
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIES.token)?.value;
  if (!token) return null;
  return verifySession(token);
}
