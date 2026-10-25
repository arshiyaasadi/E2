"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Input, Spinner } from "@/components/atoms";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { usePermissions, useRoles, useUpdateRole } from "@/features/admin-users/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { PermissionDto, RoleDto } from "@/types/domain";
import { cn } from "@/lib/utils";

function groupPermissions(permissions: PermissionDto[]) {
  const groups = new Map<string, PermissionDto[]>();

  for (const permission of permissions) {
    const [group] = permission.key.split(".");
    const items = groups.get(group) ?? [];
    items.push(permission);
    groups.set(group, items);
  }

  return Array.from(groups.entries()).map(([group, items]) => ({
    group,
    items: items.sort((a, b) => a.key.localeCompare(b.key)),
  }));
}

function RolePermissionsEditor({
  role,
  permissions,
  canManage,
}: {
  role: RoleDto;
  permissions: PermissionDto[];
  canManage: boolean;
}) {
  const t = useTranslations("admin.roles");
  const updateRole = useUpdateRole();
  const [description, setDescription] = useState(role.description ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSuperAdmin = role.name === "super_admin";

  useEffect(() => {
    setDescription(role.description ?? "");
    const ids = permissions
      .filter((permission) => role.permissionKeys.includes(permission.key))
      .map((permission) => permission.id);
    setSelectedIds(ids);
  }, [role, permissions]);

  const grouped = useMemo(() => groupPermissions(permissions), [permissions]);
  const error = updateRole.isError ? handleApiError(updateRole.error) : null;

  function togglePermission(permissionId: string, checked: boolean) {
    if (isSuperAdmin || !canManage) return;
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, permissionId])) : prev.filter((id) => id !== permissionId),
    );
  }

  async function onSave() {
    await updateRole.mutateAsync({
      roleId: role.id,
      input: {
        description: description || null,
        permissionIds: isSuperAdmin ? permissions.map((permission) => permission.id) : selectedIds,
      },
    });
  }

  return (
    <div className="flex min-h-[28rem] flex-col">
      <div className="border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
        <div className="flex flex-wrap items-start justify-between gap-mol">
          <div className="flex min-w-0 items-center gap-pad-atom-md">
            <div className="rounded-xl bg-primary/10 p-pad-atom text-primary">
              <Shield className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{role.name}</h3>
              <p className="text-xs text-muted">
                {t("userCount", { count: role.userCount })} · {t("permissionCount", { count: role.permissionKeys.length })}
              </p>
            </div>
          </div>

          {canManage && (
            <Button loading={updateRole.isPending} onClick={onSave}>
              {t("actions.save")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-mol p-mol-md">
        {error && <Alert variant="danger">{error}</Alert>}
        {isSuperAdmin && <Alert variant="warning">{t("superAdminLocked")}</Alert>}

        <Input
          label={t("fields.description")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={!canManage}
        />

        <div className="grid gap-mol lg:grid-cols-2">
          {grouped.map(({ group, items }) => (
            <Card key={group} padding="md" className="glass-panel">
              <p className="mb-pad-mol text-sm font-semibold text-foreground">{group}</p>
              <div className="flex flex-col gap-pad-atom-md">
                {items.map((permission) => (
                  <Checkbox
                    key={permission.id}
                    label={permission.key}
                    hint={permission.description ?? undefined}
                    checked={selectedIds.includes(permission.id)}
                    disabled={!canManage || isSuperAdmin}
                    onChange={(event) => togglePermission(permission.id, event.target.checked)}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminRolesPanel() {
  const t = useTranslations("admin.roles");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "users.manage", authUser.role);
  const { data: roles, isLoading: rolesLoading, isError: rolesError } = useRoles();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const selectedRole = roles?.find((role) => role.id === selectedRoleId) ?? roles?.[0] ?? null;

  useEffect(() => {
    if (!roles?.length) {
      setSelectedRoleId(null);
      return;
    }
    if (!selectedRoleId || !roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const isLoading = rolesLoading || permissionsLoading;

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-mol-lg">
            <Spinner size="lg" />
          </div>
        ) : rolesError || !roles?.length || !permissions?.length ? (
          <div className="p-mol-md">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <aside className="border-b border-white/40 lg:border-b-0 lg:border-e">
              <div className="border-b border-white/40 px-mol-md py-pad-mol">
                <p className="text-xs font-medium tracking-wide text-muted">{t("roleList")}</p>
              </div>
              <ul className="flex max-h-[min(62vh,680px)] flex-col gap-pad-atom overflow-y-auto p-pad-mol">
                {roles.map((role) => {
                  const active = selectedRole?.id === role.id;
                  return (
                    <li key={role.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className={cn(
                          "flex w-full flex-col items-start gap-pad-atom rounded-xl px-pad-mol py-pad-atom-md text-start transition-all",
                          active
                            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
                            : "text-foreground hover:bg-white/55",
                        )}
                      >
                        <span className="font-medium">{role.name}</span>
                        <span className="text-xs text-muted">
                          {t("userCount", { count: role.userCount })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section className="min-w-0">
              {selectedRole ? (
                <RolePermissionsEditor
                  role={selectedRole}
                  permissions={permissions}
                  canManage={canManage}
                />
              ) : null}
            </section>
          </div>
        )}
      </Card>

      {selectedRole ? (
        <AdminAuditHistory
          entityType="role"
          entityId={selectedRole.id}
          title={t("historyTitle", { name: selectedRole.name })}
        />
      ) : null}
    </AdminPageShell>
  );
}
