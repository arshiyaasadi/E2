import bcrypt from "bcryptjs";
import { isUiMode } from "@/config/app-mode";
import { isAdminRole } from "@/config/roles";
import {
  KeycloakAuthError,
  refreshAccessToken,
} from "@/lib/auth/keycloak/client";
import {
  findAdminUserByEmail,
  touchAdminLastLogin,
  upsertAdminUserFromKeycloak,
} from "@/lib/db/repositories/admin-user.repository";
import { getPermissionKeysForUser } from "@/lib/db/repositories/permission.repository";
import { getAdminOverview } from "@/lib/db/repositories/admin.repository";
import {
  clearAuthCookies,
  getKcRefreshToken,
  getSessionFromCookies,
  setAuthCookies,
  signSession,
} from "@/lib/api/server/session";
import type { ApiResponse, LoginResponse } from "@/types/api";

export async function loginHandler(body: unknown): Promise<ApiResponse<LoginResponse>> {
  if (!isUiMode()) {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Password login is only available in APP_MODE=ui",
      },
    };
  }

  const email =
    typeof body === "object" && body && "email" in body
      ? String((body as { email: unknown }).email ?? "")
          .trim()
          .toLowerCase()
      : "";
  const password =
    typeof body === "object" && body && "password" in body
      ? String((body as { password: unknown }).password ?? "")
      : "";

  if (!email || !password) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Email and password required" },
    };
  }

  const user = await findAdminUserByEmail(email);
  if (!user?.passwordHash || !user.isActive) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
    };
  }

  const role = user.role?.name ?? "";
  if (!isAdminRole(role)) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient role" },
    };
  }

  await touchAdminLastLogin(user.id);

  const token = await signSession({
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
  });
  await setAuthCookies(token, role);

  const permissions = await getPermissionKeysForUser(user.id);
  return {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role,
      permissions,
    },
  };
}

export async function logoutHandler(): Promise<ApiResponse<{ ok: true }>> {
  await clearAuthCookies();
  return { success: true, data: { ok: true } };
}

export async function refreshHandler(): Promise<ApiResponse<LoginResponse>> {
  if (isUiMode()) {
    const session = await getSessionFromCookies();
    if (!session || !isAdminRole(session.role)) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      };
    }

    const token = await signSession(session);
    await setAuthCookies(token, session.role);
    const permissions = await getPermissionKeysForUser(session.sub);
    return {
      success: true,
      data: {
        userId: session.sub,
        email: session.email,
        fullName: session.fullName,
        role: session.role,
        permissions,
      },
    };
  }

  const refresh = await getKcRefreshToken();
  if (!refresh) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "No refresh token" },
    };
  }

  try {
    const kc = await refreshAccessToken(refresh);
    const user = await upsertAdminUserFromKeycloak({
      keycloakSub: kc.sub,
      email: kc.email,
      fullName: kc.fullName,
      roleName: kc.role,
    });

    if (!user.isActive) {
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Inactive user" },
      };
    }

    const role = user.role?.name ?? kc.role;
    if (!isAdminRole(role)) {
      return {
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient role" },
      };
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

    const permissions = await getPermissionKeysForUser(user.id);
    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        role,
        permissions,
      },
    };
  } catch (err) {
    if (err instanceof KeycloakAuthError) {
      await clearAuthCookies();
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Session expired" },
      };
    }
    console.error("[admin-auth] refresh failed", err);
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Session expired" },
    };
  }
}

export async function adminOverviewHandler(): Promise<
  ApiResponse<Awaited<ReturnType<typeof getAdminOverview>>>
> {
  const data = await getAdminOverview();
  return { success: true, data };
}

export async function meHandler(): Promise<ApiResponse<LoginResponse>> {
  const session = await getSessionFromCookies();
  if (!session || !isAdminRole(session.role)) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    };
  }

  const permissions = await getPermissionKeysForUser(session.sub);

  return {
    success: true,
    data: {
      userId: session.sub,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      permissions,
    },
  };
}
