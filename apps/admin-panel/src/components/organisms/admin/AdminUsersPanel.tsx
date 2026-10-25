"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Card, EmptyState, Input, Modal, ModalBody, ModalFooter, Select, Spinner, Toggle } from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import {
  useAdminUsers,
  useCreateAdminUser,
  useDeleteAdminUser,
  useRoles,
  useUpdateAdminUser,
} from "@/features/admin-users/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { AdminUserDto } from "@/types/domain";

interface UserFormState {
  email: string;
  fullName: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

const emptyForm: UserFormState = {
  email: "",
  fullName: "",
  password: "",
  roleId: "",
  isActive: true,
};

function UserFormModal({
  open,
  mode,
  user,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  user: AdminUserDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.users");
  const { data: roles } = useRoles();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const [form, setForm] = useState<UserFormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        email: user.email,
        fullName: user.fullName ?? "",
        password: "",
        roleId: user.roleId ?? "",
        isActive: user.isActive,
      });
      return;
    }
    setForm({
      ...emptyForm,
      roleId: roles?.[0]?.id ?? "",
    });
  }, [open, mode, user, roles]);

  const roleOptions = useMemo(
    () => (roles ?? []).map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const mutation = mode === "create" ? createUser : updateUser;
  const error = mutation.isError ? handleApiError(mutation.error) : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (mode === "create") {
      await createUser.mutateAsync({
        email: form.email,
        password: form.password,
        fullName: form.fullName || null,
        roleId: form.roleId,
        isActive: form.isActive,
      });
    } else if (user) {
      await updateUser.mutateAsync({
        userId: user.id,
        input: {
          email: form.email,
          fullName: form.fullName || null,
          roleId: form.roleId,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {}),
        },
      });
    }

    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? t("createTitle") : t("editTitle")} size="lg">
      <form onSubmit={onSubmit}>
        <ModalBody className="flex flex-col gap-mol">
          {error && <Alert variant="danger">{error}</Alert>}

          <Input
            label={t("fields.email")}
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            textDirection="ltr"
            required
          />
          <Input
            label={t("fields.fullName")}
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
          <Input
            label={mode === "create" ? t("fields.password") : t("fields.passwordOptional")}
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            textDirection="ltr"
            required={mode === "create"}
            minLength={8}
          />
          <Select
            label={t("fields.role")}
            options={roleOptions}
            value={form.roleId}
            onChange={(event) => setForm((prev) => ({ ...prev, roleId: event.target.value }))}
            required
          />
          <Toggle
            checked={form.isActive}
            onChange={(isActive) => setForm((prev) => ({ ...prev, isActive }))}
            label={t("fields.isActive")}
          />
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mode === "create" ? t("actions.create") : t("actions.save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export function AdminUsersPanel() {
  const t = useTranslations("admin.users");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "users.manage", authUser.role);
  const { data, isLoading, isError } = useAdminUsers();
  const deleteUser = useDeleteAdminUser();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);

  function openCreate() {
    setModalMode("create");
    setSelectedUser(null);
    setModalOpen(true);
  }

  function openEdit(user: AdminUserDto) {
    setModalMode("edit");
    setSelectedUser(user);
    setModalOpen(true);
  }

  async function onDelete(user: AdminUserDto) {
    if (!window.confirm(t("confirmDelete", { email: user.email }))) return;
    await deleteUser.mutateAsync(user.id);
  }

  return (
    <AdminPageShell
      title={t("title")}
      description={t("subtitle")}
      stats={
        canManage ? (
          <div className="flex justify-end">
            <Button onClick={openCreate}>{t("actions.create")}</Button>
          </div>
        ) : undefined
      }
    >
      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-mol-lg">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="p-mol-md">
            <Alert variant="danger">{t("error")}</Alert>
          </div>
        ) : !data?.length ? (
          <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("columns.fullName")}</Th>
                <Th>{t("columns.email")}</Th>
                <Th>{t("columns.role")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.lastLogin")}</Th>
                {canManage && <Th>{t("columns.actions")}</Th>}
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((user) => (
                <Tr key={user.id}>
                  <Td>{user.fullName ?? "—"}</Td>
                  <Td className="font-mono text-xs">{user.email}</Td>
                  <Td>
                    <Badge variant="primary">{user.roleName ?? "—"}</Badge>
                  </Td>
                  <Td>
                    <Badge variant={user.isActive ? "success" : "neutral"}>
                      {user.isActive ? t("status.active") : t("status.inactive")}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-muted">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fa-IR") : "—"}
                  </Td>
                  {canManage && (
                    <Td>
                      <div className="flex items-center gap-pad-atom">
                        <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                          {t("actions.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          loading={deleteUser.isPending}
                          disabled={user.id === authUser.userId}
                          onClick={() => onDelete(user)}
                        >
                          {t("actions.delete")}
                        </Button>
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {canManage && (
        <UserFormModal
          open={modalOpen}
          mode={modalMode}
          user={selectedUser}
          onClose={() => setModalOpen(false)}
        />
      )}

      <AdminAuditHistory entityType="admin_user" />
    </AdminPageShell>
  );
}
