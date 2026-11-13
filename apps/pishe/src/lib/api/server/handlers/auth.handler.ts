import { headers } from "next/headers";
import { z } from "zod";
import {
  clearAuthCookies,
  getSessionFromCookies,
  setAuthCookies,
} from "@/lib/api/server/session";
import {
  checkKeycloakHealth,
  createPreRegistrationUser,
  findUserByUsername,
  getAppToken,
  isPreRegistrationPending,
  KeycloakAuthError,
} from "@/lib/auth/keycloak/client";
import { normalizeIranMobile, toLatinDigits } from "@/lib/auth/mobile";
import {
  getProfileOverride,
  upsertProfileNames,
} from "@/lib/auth/profiles-store";
import {
  listLoginSessionsForUser,
  recordLoginSession,
} from "@/lib/auth/sessions-store";
import type {
  ApiResponse,
  AuthUserResponse,
  LoginSessionResponse,
} from "@/types/api";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(true),
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  mobile: z.string().trim().min(10).max(20),
});

async function toAuthResponse(user: {
  sub: string;
  username: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
}): Promise<AuthUserResponse> {
  const override = await getProfileOverride(user.sub);
  const firstName = override?.firstName ?? user.firstName ?? "";
  const lastName = override?.lastName ?? user.lastName ?? "";
  const displayName =
    `${firstName} ${lastName}`.trim() || user.displayName || user.username;
  return {
    userId: user.sub,
    username: user.username,
    displayName,
    firstName,
    lastName,
    mobile: user.mobile ?? user.username,
    shopName: null,
    avatarUrl: null,
    mustChangePassword: false,
    currency: "rial",
  };
}

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
});

function fromKeycloakError(error: unknown): ApiResponse<never> {
  if (error instanceof KeycloakAuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  console.error("[pishe-auth]", error);
  return {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unexpected auth error" },
  };
}

export async function registerHandler(
  body: unknown,
): Promise<ApiResponse<{ username: string; message: string }>> {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  const mobile = normalizeIranMobile(parsed.data.mobile);
  if (!mobile) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid mobile number" },
    };
  }

  try {
    const { username } = await createPreRegistrationUser({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      mobile,
    });

    return {
      success: true,
      data: {
        username,
        message: "Pre-registration received; access pending operator approval",
      },
    };
  } catch (error) {
    return fromKeycloakError(error);
  }
}

export async function loginHandler(
  body: unknown,
): Promise<ApiResponse<AuthUserResponse>> {
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Username and password are required",
      },
    };
  }

  const rawUsername = toLatinDigits(parsed.data.username).trim();
  const username = normalizeIranMobile(rawUsername) ?? rawUsername;
  const password = toLatinDigits(parsed.data.password);

  try {
    const existing = await findUserByUsername(username);
    if (isPreRegistrationPending(existing)) {
      return {
        success: false,
        error: {
          code: "PRE_REGISTRATION_PENDING",
          message: "Registration pending approval",
        },
      };
    }

    const tokens = await getAppToken(username, password);
    await setAuthCookies({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      rememberMe: parsed.data.rememberMe,
    });

    const given = tokens.payload.given_name
      ? String(tokens.payload.given_name)
      : "";
    const family = tokens.payload.family_name
      ? String(tokens.payload.family_name)
      : "";
    const preferred = String(
      tokens.payload.preferred_username ?? username,
    );
    const displayName =
      (tokens.payload.name ? String(tokens.payload.name) : "") ||
      `${given} ${family}`.trim() ||
      preferred;

    const h = await headers();
    const ua = h.get("user-agent");
    const forwarded = h.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;

    try {
      await recordLoginSession({
        userId: String(tokens.payload.sub),
        ip,
        userAgent: ua,
      });
    } catch (err) {
      console.error("[pishe-auth] session record failed", err);
    }

    return {
      success: true,
      data: await toAuthResponse({
        sub: String(tokens.payload.sub),
        username: preferred,
        displayName,
        firstName: given,
        lastName: family,
        mobile: preferred,
      }),
    };
  } catch (error) {
    if (error instanceof KeycloakAuthError && error.code === "UNAUTHORIZED") {
      return {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid username or password" },
      };
    }
    return fromKeycloakError(error);
  }
}

export async function logoutHandler(): Promise<ApiResponse<{ ok: true }>> {
  await clearAuthCookies();
  return { success: true, data: { ok: true } };
}

export async function meHandler(): Promise<ApiResponse<AuthUserResponse>> {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    };
  }

  return {
    success: true,
    data: await toAuthResponse(session),
  };
}

export async function updateProfileHandler(
  body: unknown,
): Promise<ApiResponse<AuthUserResponse>> {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    };
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  await upsertProfileNames({
    userId: session.sub,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  });

  return {
    success: true,
    data: await toAuthResponse({
      ...session,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
    }),
  };
}

export async function sessionsHandler(): Promise<
  ApiResponse<{ sessions: LoginSessionResponse[] }>
> {
  const session = await getSessionFromCookies();
  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    };
  }

  const rows = await listLoginSessionsForUser(session.sub);
  return {
    success: true,
    data: {
      sessions: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        deviceLabel: r.deviceLabel,
        ip: r.ip,
      })),
    },
  };
}

export async function healthHandler(): Promise<
  ApiResponse<{ status: string; keycloak: { ok: boolean; issuer: string; detail?: string } }>
> {
  const keycloak = await checkKeycloakHealth();
  return {
    success: true,
    data: {
      status: keycloak.ok ? "ok" : "degraded",
      keycloak,
    },
  };
}
