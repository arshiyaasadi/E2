"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  useBlogTags,
  useCreateBlogTag,
  useDeleteBlogTag,
  useUpdateBlogTag,
} from "@/features/blog/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { BlogTagDto } from "@/types/domain";

type FormState = { nameFa: string; name: string; slug: string };
const empty: FormState = { nameFa: "", name: "", slug: "" };

export function AdminBlogTagsPanel() {
  const t = useTranslations("admin.blogTags");
  const user = useAuthUser();
  const canManage = hasPermission(user?.permissions, "blog.manage", user?.role);
  const list = useBlogTags();
  const create = useCreateBlogTag();
  const update = useUpdateBlogTag();
  const remove = useDeleteBlogTag();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BlogTagDto | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({ nameFa: editing.nameFa, name: editing.name ?? "", slug: editing.slug });
    } else {
      setForm(empty);
    }
    setError(null);
  }, [open, editing]);

  async function onSave() {
    setError(null);
    const payload = {
      nameFa: form.nameFa.trim(),
      name: form.name.trim() || null,
      slug: form.slug.trim(),
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input: payload });
      else await create.mutateAsync(payload);
      setOpen(false);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const rows = list.data ?? [];

  return (
    <AdminPageShell
      title={t("title")}
      description={t("description")}
      stats={
        canManage ? (
          <div className="flex justify-end">
            <Button
              startIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              {t("actions.create")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {list.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHead>
              <Tr>
                <Th>{t("columns.nameFa")}</Th>
                <Th>{t("columns.slug")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td>{row.nameFa}</Td>
                  <Td dir="ltr" className="font-mono text-xs">
                    {row.slug}
                  </Td>
                  <Td>
                    {canManage ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(row);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            if (!window.confirm(t("confirmDelete"))) return;
                            try {
                              await remove.mutateAsync(row.id);
                            } catch (err) {
                              setError(handleApiError(err));
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("editTitle") : t("createTitle")}
        size="md"
      >
        <ModalBody className="grid gap-mol">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Input
            label={t("fields.nameFa")}
            value={form.nameFa}
            onChange={(e) => setForm((p) => ({ ...p, nameFa: e.target.value }))}
          />
          <Input
            label={t("fields.nameEn")}
            value={form.name}
            dir="ltr"
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label={t("fields.slug")}
            value={form.slug}
            dir="ltr"
            hint={t("fields.slugHint")}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={() => void onSave()} disabled={create.isPending || update.isPending}>
            {t("actions.save")}
          </Button>
        </ModalFooter>
      </Modal>
    </AdminPageShell>
  );
}
