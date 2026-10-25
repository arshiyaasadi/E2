import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIES, isAdminRole } from "@/config/roles";
import { ROUTES } from "@/config/routes";

async function verifiedRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(AUTH_COOKIES.token)?.value;
  if (!token) return null;
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    const role = payload.role ? String(payload.role) : null;
    return isAdminRole(role) ? role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminRole = await verifiedRole(request);
  const isAdminAuthenticated = Boolean(adminRole);

  if (pathname.startsWith("/login")) {
    if (isAdminAuthenticated) {
      return NextResponse.redirect(new URL(ROUTES.adminDatabase, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!isAdminAuthenticated) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    if (pathname.startsWith("/admin/project") && adminRole === "editor") {
      return NextResponse.redirect(new URL(ROUTES.adminProducts, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!isAdminAuthenticated) {
      return NextResponse.redirect(new URL(ROUTES.login, request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login"],
};
