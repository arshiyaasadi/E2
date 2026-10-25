export const ADMIN_ROLES = ["super_admin", "admin", "editor"] as const;
export const PANEL_ROLES = ["client", "manager", "admin", "super_admin", "editor"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return !!role && ADMIN_ROLES.includes(role as AdminRole);
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin";
}

export function hasPermission(
  permissions: string[],
  permission: string,
  role?: string | null,
): boolean {
  if (isSuperAdminRole(role)) return true;
  return permissions.includes(permission);
}

export const COOKIE_PREFIX = "admin";

export const AUTH_COOKIES = {
  token: `${COOKIE_PREFIX}_token`,
  role: `${COOKIE_PREFIX}_role`,
} as const;
