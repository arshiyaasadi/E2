"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, Pencil, Trash2 } from "lucide-react";
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
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "@/features/tags/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";
import type { TagDto } from "@/types/domain";

interface TagFormState {
  name: string;
  nameFa: string;
  slug: string;
}

type TagFilters = {
  q: string;
  name: string;
  nameFa: string;
  slug: string;
};

const emptyForm: TagFormState = { name: "", nameFa: "", slug: "" };
const emptyFilters: TagFilters = { q: "", name: "", nameFa: "", slug: "" };

function slugifyDraft(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function TagFormModal({
  open,
  mode,
  tag,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  tag: TagDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.tags");
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const [form, setForm] = useState<TagFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && tag) {
      setForm({ name: tag.name, nameFa: tag.nameFa, slug: tag.slug });
    } else {
      setForm(emptyForm);
    }
    setSlugTouched(mode === "edit");
    setError(null);
  }, [open, mode, tag]);

  async function onSave() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      nameFa: form.nameFa.trim(),
      slug: form.slug.trim() || undefined,
    };

    try {
      if (mode === "create") {
        await createTag.mutateAsync(payload);
      } else if (tag) {
        await updateTag.mutateAsync({ tagId: tag.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createTag.isPending || updateTag.isPending;
  const canSave = form.name.trim() && form.nameFa.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="md"
    >
      <ModalBody className="grid gap-mol">
        <div className="grid gap-mol sm:grid-cols-2">
          <Input
            label={t("fields.nameEn")}
            value={form.name}
            onChange={(event) =>
              setForm((prev) => {
                const name = event.target.value;
                return {
                  ...prev,
                  name,
                  slug: slugTouched ? prev.slug : slugifyDraft(name),
                };
              })
            }
            textDirection="ltr"
          />
          <Input
            label={t("fields.nameFa")}
            value={form.nameFa}
            onChange={(event) => setForm((prev) => ({ ...prev, nameFa: event.target.value }))}
          />
        </div>
        <Input
          label={t("fields.slug")}
          hint={t("fields.slugHint")}
          value={form.slug}
          onChange={(event) => {
            setSlugTouched(true);
            setForm((prev) => ({ ...prev, slug: event.target.value }));
          }}
          textDirection="ltr"
        />
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button loading={pending} onClick={onSave} disabled={!canSave}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function TagDetailsModal({ tag, onClose }: { tag: TagDto | null; onClose: () => void }) {
  const t = useTranslations("admin.tags");

  return (
    <Modal open={!!tag} onClose={onClose} title={t("detailsTitle")} size="md">
      <ModalBody className="grid gap-mol">
        {tag ? (
          <div className="grid gap-mol sm:grid-cols-2">
            <Input label={t("fields.nameEn")} value={tag.name} readOnly textDirection="ltr" />
            <Input label={t("fields.nameFa")} value={tag.nameFa} readOnly />
            <Input label={t("fields.slug")} value={tag.slug} readOnly textDirection="ltr" />
            <Input
              label={t("fields.createdAt")}
              value={new Date(tag.createdAt).toLocaleDateString("fa-IR")}
              readOnly
            />
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminTagsPanel() {
  const t = useTranslations("admin.tags");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "products.view", user.role);
  const canManage = hasPermission(user.permissions, "products.manage", user.role);
  const { data, isLoading, isError } = useTags();
  const deleteTag = useDeleteTag();

  const [draftFilters, setDraftFilters] = useState<TagFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<TagFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTag, setSelectedTag] = useState<TagDto | null>(null);
  const [viewTag, setViewTag] = useState<TagDto | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = appliedFilters.q.trim().toLowerCase();
    const name = appliedFilters.name.trim().toLowerCase();
    const nameFa = appliedFilters.nameFa.trim().toLowerCase();
    const slug = appliedFilters.slug.trim().toLowerCase();

    return data.filter((tag) => {
      if (q) {
        const haystack = `${tag.name} ${tag.nameFa} ${tag.slug}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (name && !tag.name.toLowerCase().includes(name)) return false;
      if (nameFa && !tag.nameFa.toLowerCase().includes(nameFa)) return false;
      if (slug && !tag.slug.toLowerCase().includes(slug)) return false;
      return true;
    });
  }, [data, appliedFilters]);

  function openCreate() {
    setModalMode("create");
    setSelectedTag(null);
    setModalOpen(true);
  }

  function openEdit(tag: TagDto) {
    setModalMode("edit");
    setSelectedTag(tag);
    setModalOpen(true);
  }

  async function onDelete(tag: TagDto) {
    if (!window.confirm(t("confirmDelete", { name: tag.nameFa || tag.name }))) return;
    try {
      await deleteTag.mutateAsync(tag.id);
    } catch (err) {
      window.alert(handleApiError(err));
    }
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  }

  if (!canView) {
    return (
      <AdminPageShell title={t("title")} description={t("subtitle")}>
        <Alert variant="warning">{t("noAccess")}</Alert>
      </AdminPageShell>
    );
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
      <Card className="mb-mol p-mol-md">
        <div className="flex flex-col gap-mol sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("fields.search")}
              value={draftFilters.q}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, q: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
            />
          </div>
          <div className="flex shrink-0 gap-atom">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(filtersOpen && "border-primary/40 bg-primary/5")}
            >
              <Filter className="size-4" />
              {t("actions.advancedFilters")}
            </Button>
            <Button onClick={applyFilters}>{t("actions.apply")}</Button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="mt-mol grid gap-mol border-t border-border/70 pt-mol md:grid-cols-3">
            <Input
              label={t("fields.nameEn")}
              value={draftFilters.name}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, name: event.target.value }))}
              textDirection="ltr"
            />
            <Input
              label={t("fields.nameFa")}
              value={draftFilters.nameFa}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, nameFa: event.target.value }))
              }
            />
            <Input
              label={t("fields.slug")}
              value={draftFilters.slug}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, slug: event.target.value }))}
              textDirection="ltr"
            />
            <div className="md:col-span-3">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t("actions.resetFilters")}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-mol-md">
          <Spinner />
        </div>
      ) : isError ? (
        <Alert variant="danger">{t("error")}</Alert>
      ) : !filtered.length ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("columns.name")}</Th>
                <Th>{t("columns.nameFa")}</Th>
                <Th>{t("columns.slug")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((tag) => (
                <Tr key={tag.id}>
                  <Td className="font-medium" dir="ltr">
                    {tag.name}
                  </Td>
                  <Td>{tag.nameFa}</Td>
                  <Td className="font-mono text-xs" dir="ltr">
                    {tag.slug}
                  </Td>
                  <Td>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewTag(tag)}
                        className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                        aria-label={t("actions.view")}
                      >
                        <Eye className="size-4" />
                      </button>
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(tag)}
                            className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                            aria-label={t("actions.edit")}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(tag)}
                            className="inline-flex items-center justify-center rounded-lg border border-red-200/80 bg-red-50/80 p-2 text-danger transition hover:bg-red-100"
                            aria-label={t("actions.delete")}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AdminAuditHistory entityType="tag" />

      {canManage ? (
        <TagFormModal
          open={modalOpen}
          mode={modalMode}
          tag={selectedTag}
          onClose={() => setModalOpen(false)}
        />
      ) : null}

      <TagDetailsModal tag={viewTag} onClose={() => setViewTag(null)} />
    </AdminPageShell>
  );
}
