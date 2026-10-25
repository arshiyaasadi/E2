import { NextResponse } from "next/server";
import { isAdminRole } from "@/config/roles";
import { ROUTES } from "@/config/routes";
import {
  KeycloakAuthError,
  exchangeAuthorizationCode,
} from "@/lib/auth/keycloak/client";
import {
  clearOidcPendingCookies,
  getOidcPendingCookies,
  setAuthCookies,
  signSession,
} from "@/lib/api/server/session";
import {
  touchAdminLastLogin,
  upsertAdminUserFromKeycloak,
} from "@/lib/db/repositories/admin-user.repository";

function appOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const loginUrl = new URL(ROUTES.login, origin);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    loginUrl.searchParams.set("error", error);
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !state) {
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  const pending = await getOidcPendingCookies();
  if (!pending.state || !pending.verifier || pending.state !== state) {
    await clearOidcPendingCookies();
    loginUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  const redirectUri = `${origin}/api/auth/oidc/callback`;

  try {
    const kc = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.verifier,
      redirectUri,
    });

    await clearOidcPendingCookies();

    const user = await upsertAdminUserFromKeycloak({
      keycloakSub: kc.sub,
      email: kc.email,
      fullName: kc.fullName,
      roleName: kc.role,
    });

    if (!user.isActive) {
      loginUrl.searchParams.set("error", "inactive");
      return NextResponse.redirect(loginUrl);
    }

    const role = user.role?.name ?? kc.role;
    if (!isAdminRole(role)) {
      loginUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(loginUrl);
    }

    const token = await signSession({
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
    });

    await setAuthCookies(token, role, {
      refreshToken: kc.refreshToken,
      idToken: kc.idToken,
    });
    await touchAdminLastLogin(user.id);

    return NextResponse.redirect(new URL(ROUTES.adminDatabase, origin));
  } catch (err) {
    await clearOidcPendingCookies();
    console.error("[oidc-callback]", err);
    const codeName =
      err instanceof KeycloakAuthError && err.code === "FORBIDDEN"
        ? "forbidden"
        : "login_failed";
    loginUrl.searchParams.set("error", codeName);
    return NextResponse.redirect(loginUrl);
  }
}
