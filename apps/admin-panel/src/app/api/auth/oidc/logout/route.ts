import { NextResponse } from "next/server";
import { ROUTES } from "@/config/routes";
import { buildLogoutUrl } from "@/lib/auth/keycloak/client";
import {
  clearAuthCookies,
  getKcIdToken,
} from "@/lib/api/server/session";

function appOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const idToken = await getKcIdToken();
  await clearAuthCookies();

  const logoutUrl = buildLogoutUrl({
    postLogoutRedirectUri: `${origin}${ROUTES.login}`,
    idTokenHint: idToken,
  });

  return NextResponse.redirect(logoutUrl);
}
