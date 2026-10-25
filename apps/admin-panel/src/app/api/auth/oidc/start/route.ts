import { NextResponse } from "next/server";
import {
  buildAuthorizeUrl,
  createOidcState,
  createPkcePair,
} from "@/lib/auth/keycloak/client";
import { setOidcPendingCookies } from "@/lib/api/server/session";

function appOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const redirectUri = `${origin}/api/auth/oidc/callback`;
  const state = createOidcState();
  const { verifier, challenge } = createPkcePair();

  await setOidcPendingCookies(state, verifier);

  const url = buildAuthorizeUrl({
    redirectUri,
    state,
    codeChallenge: challenge,
  });

  return NextResponse.redirect(url);
}
