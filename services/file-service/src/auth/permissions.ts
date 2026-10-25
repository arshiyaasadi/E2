export type Permission =
  | "file.product_image.upload"
  | "file.product_image.read"
  | "file.product_image.delete";

const STORE_FILE_PERMS: Permission[] = [
  "file.product_image.upload",
  "file.product_image.read",
  "file.product_image.delete",
];

/** Application-owned map (ADR 0004). Not stored in Keycloak. */
export const ROLE_PERMISSIONS: Record<string, Permission[] | "*"> = {
  "platform-super-admin": "*",
  "store-owner": STORE_FILE_PERMS,
  "store-admin": STORE_FILE_PERMS,
  "store-editor": STORE_FILE_PERMS,
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

export function canAccessStore(
  roles: string[],
  tokenStoreId: string | undefined,
  resourceStoreId: string,
): boolean {
  if (roles.includes("platform-super-admin")) return true;
  return Boolean(tokenStoreId) && tokenStoreId === resourceStoreId;
}
