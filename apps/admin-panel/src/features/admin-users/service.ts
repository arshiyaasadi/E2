import { apiClient } from "@/lib/api/client";
import type {
  AdminUserDto,
  AuditLogDto,
  CreateAdminUserInput,
  PermissionDto,
  RoleDto,
  UpdateAdminUserInput,
  UpdateRoleInput,
} from "@/types/domain";

export function fetchAdminUsers() {
  return apiClient.get<AdminUserDto[]>("/admin/users");
}

export function fetchAdminUser(userId: string) {
  return apiClient.get<AdminUserDto>(`/admin/users/${userId}`);
}

export function createAdminUser(input: CreateAdminUserInput) {
  return apiClient.post<AdminUserDto>("/admin/users", input);
}

export function updateAdminUser(userId: string, input: UpdateAdminUserInput) {
  return apiClient.put<AdminUserDto>(`/admin/users/${userId}`, input);
}

export function deleteAdminUser(userId: string) {
  return apiClient.delete<{ ok: true }>(`/admin/users/${userId}`);
}

export function fetchRoles() {
  return apiClient.get<RoleDto[]>("/admin/roles");
}

export function fetchPermissions() {
  return apiClient.get<PermissionDto[]>("/admin/permissions");
}

export function updateRole(roleId: string, input: UpdateRoleInput) {
  return apiClient.put<RoleDto>(`/admin/roles/${roleId}`, input);
}

export function fetchAuditLogs(params: { entityType?: string; entityId?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params.entityType) query.set("entityType", params.entityType);
  if (params.entityId) query.set("entityId", params.entityId);
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiClient.get<AuditLogDto[]>(`/admin/audit-logs${suffix}`);
}
