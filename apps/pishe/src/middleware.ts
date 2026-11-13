import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, ROUTES } from "@/config/routes";

function issuerFromEnv(): string | null {
  const base = process.env.KEYCLOAK_BASE_URL?.replace(/\/$/, "");
  const realm = process.env.KEYCLOAK_REALM || "pishe";
  if (!base) return null;
  return `${base}/realms/${realm}`;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(issuer: string) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  }
  return jwks;
}

async function hasValidAccess(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIES.access)?.value;
  if (!token) return false;
  const issuer = issuerFromEnv();
  if (!issuer) return false;
  try {
    await jwtVerify(token, getJwks(issuer), { issuer });
    return true;
  } catch {
    return false;
  }
}

function hasRefresh(request: NextRequest): boolean {
  return Boolean(request.cookies.get(AUTH_COOKIES.refresh)?.value);
}

/** Access JWT valid, or refresh cookie present (BFF will refresh on /auth/me). */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  if (await hasValidAccess(request)) return true;
  return hasRefresh(request);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);
  const isAuthPage = pathname === ROUTES.login || pathname === ROUTES.register;

  if (isAuthPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL(ROUTES.home, request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/products", "/products/:path*"],
};
