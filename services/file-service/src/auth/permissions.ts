export type Permission =
  | "file.product_image.upload"
  | "file.product_image.read"
  | "file.product_image.delete"
  | "file.product_image.replace";

const CALLER_FILE_PERMS: Permission[] = [
  "file.product_image.upload",
  "file.product_image.read",
  "file.product_image.delete",
  "file.product_image.replace",
];

/** Application-owned map (ADR 0004). Not stored in Keycloak. */
export const ROLE_PERMISSIONS: Record<string, Permission[] | "*"> = {
  "platform-super-admin": "*",
  "file-service-admin": "*",
  "file-service-caller": CALLER_FILE_PERMS,
};

export function permissionsForRoles(roles: string[]): Set<Permission | "*"> {
  const out = new Set<Permission | "*">();
  for (const role of roles) {
    const mapped = ROLE_PERMISSIONS[role];
    if (!mapped) continue;
    if (mapped === "*") {
      out.add("*");
      continue;
    }
    for (const p of mapped) out.add(p);
  }
  return out;
}

export function hasPermission(
  roles: string[],
  permission: Permission,
): boolean {
  const perms = permissionsForRoles(roles);
  return perms.has("*") || perms.has(permission);
}

/** Privileged callers may omit / override user scope checks. */
export function isPrivilegedCaller(roles: string[]): boolean {
  return (
    roles.includes("platform-super-admin") ||
    roles.includes("file-service-admin")
  );
}

/**
 * On existing resources, request userId must match the file owner
 * unless the caller is privileged.
 */
export function canAccessUser(
  roles: string[],
  requestUserId: string | undefined,
  resourceUserId: string,
): boolean {
  if (isPrivilegedCaller(roles)) return true;
  return Boolean(requestUserId) && requestUserId === resourceUserId;
}
