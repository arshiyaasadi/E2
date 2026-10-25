import { isAdminRole, isSuperAdminRole } from "@/config/roles";
import { getSessionFromCookies } from "@/lib/api/server/session";
import { getPermissionKeysForUser } from "@/lib/db/repositories/permission.repository";
import type { ApiErrorBody, ApiResponse } from "@/types/api";

type GuardFail = { ok: false; response: ApiErrorBody };

export async function requireSession(): Promise<
  { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSessionFromCookies>>> } | GuardFail
> {
  const session = await getSessionFromCookies();
  if (!session || !isAdminRole(session.role)) {
    return {
      ok: false,
      response: {
        success: false as const,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
    };
  }

  return { ok: true, session };
}

export async function requirePermission(permission: string) {
  const auth = await requireSession();
  if (!auth.ok) return auth;

  if (isSuperAdminRole(auth.session.role)) {
    const permissions = await getPermissionKeysForUser(auth.session.sub);
    return { ok: true as const, session: auth.session, permissions };
  }

  const permissions = await getPermissionKeysForUser(auth.session.sub);
  if (!permissions.includes(permission)) {
    return {
      ok: false as const,
      response: {
        success: false as const,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      },
    };
  }

  return { ok: true as const, session: auth.session, permissions };
}

export async function requireSuperAdmin() {
  const auth = await requireSession();
  if (!auth.ok) return auth;

  if (!isSuperAdminRole(auth.session.role)) {
    return {
      ok: false as const,
      response: {
        success: false as const,
        error: { code: "FORBIDDEN", message: "Super admin access required" },
      },
    };
  }

  const permissions = await getPermissionKeysForUser(auth.session.sub);
  return { ok: true as const, session: auth.session, permissions };
}
