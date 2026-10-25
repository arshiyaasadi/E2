"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Spinner,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import {
  useCreateShopPage,
  useDeleteShopPage,
  useShopPages,
  useUpdateShopPage,
} from "@/features/shop-pages/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";
import type { ShopPageDto, ShopPageStatus, ShopPageType } from "@/types/domain";

interface ShopPageFormState {
  title: string;
  titleFa: string;
  description: string;
  slug: string;
  type: ShopPageType;
  status: ShopPageStatus;
  isMain: boolean;
  mapsCategorySlug: string;
  filters: string;
  pinnedProductIds: string;
  blocks: string;
  seoTitle: string;
  seoDescription: string;
  seoImageId: string;
}

type ShopPageFilters = {
  q: string;
  type: "" | ShopPageType;
  status: "" | ShopPageStatus;
  isMain: "" | "true" | "false";
};

const emptyForm: ShopPageFormState = {
  title: "",
  titleFa: "",
  description: "",
  slug: "",
  type: "landing",
  status: "draft",
  isMain: false,
  mapsCategorySlug: "",
  filters: "{}",
  pinnedProductIds: "[]",
  blocks: "[]",
  seoTitle: "",
  seoDescription: "",
  seoImageId: "",
};

const emptyFilters: ShopPageFilters = {
  q: "",
  type: "",
  status: "",
  isMain: "",
};

function slugifyDraft(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatJson(value: unknown, fallback: string) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

function parseJsonField(raw: string, label: string): Record<string, unknown> | unknown[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return label === "filters" ? {} : [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (label === "filters") {
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("filters must be a JSON object");
      }
      return parsed as Record<string, unknown>;
    }
    if (!Array.isArray(parsed)) {
      throw new Error("blocks must be a JSON array");
    }
    return parsed;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `Invalid ${label} JSON`);
  }
}

function JsonField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-atom">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <textarea
        className="min-h-36 rounded-xl border border-white/50 bg-white/50 p-pad-mol font-mono text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        dir="ltr"
        spellCheck={false}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function ShopPageFormModal({
  open,
  mode,
  page,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  page: ShopPageDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.shopPages");
  const createShopPage = useCreateShopPage();
  const updateShopPage = useUpdateShopPage();
  const [form, setForm] = useState<ShopPageFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && page) {
      setForm({
        title: page.title,
        titleFa: page.titleFa ?? "",
        description: page.description ?? "",
        slug: page.slug,
        type: page.type,
        status: page.status,
        isMain: page.isMain,
        mapsCategorySlug: page.mapsCategorySlug ?? "",
        filters: formatJson(page.filters, "{}"),
        pinnedProductIds: formatJson(page.pinnedProductIds ?? [], "[]"),
        blocks: formatJson(page.blocks, "[]"),
        seoTitle: page.seoTitle ?? "",
        seoDescription: page.seoDescription ?? "",
        seoImageId: page.seoImageId ?? "",
      });
    } else {
      setForm(emptyForm);
    }
    setSlugTouched(mode === "edit");
    setError(null);
  }, [open, mode, page]);

  async function onSave() {
    setError(null);

    let filters: Record<string, unknown>;
    let blocks: unknown[];
    let pinnedProductIds: string[];
    try {
      filters = parseJsonField(form.filters, "filters") as Record<string, unknown>;
      blocks = parseJsonField(form.blocks, "blocks") as unknown[];
      const pinnedRaw = parseJsonField(form.pinnedProductIds, "pinnedProductIds");
      if (!Array.isArray(pinnedRaw) || pinnedRaw.some((id) => typeof id !== "string")) {
        throw new Error("pinnedProductIds must be a JSON array of UUID strings");
      }
      pinnedProductIds = pinnedRaw as string[];
    } catch (err) {
      setError(err instanceof Error ? err.message : t("validation.invalidJson"));
      return;
    }

    const payload = {
      title: form.title.trim(),
      titleFa: form.titleFa.trim() || null,
      description: form.description.trim() || null,
      slug: form.slug.trim() || undefined,
      type: form.type,
      status: form.status,
      isMain: form.isMain,
      mapsCategorySlug: form.mapsCategorySlug.trim() || null,
      filters,
      pinnedProductIds,
      blocks,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      seoImageId: form.seoImageId.trim() || null,
    };

    try {
      if (mode === "create") {
        await createShopPage.mutateAsync(payload);
      } else if (page) {
        await updateShopPage.mutateAsync({ shopPageId: page.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createShopPage.isPending || updateShopPage.isPending;
  const canSave = form.title.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="xl"
    >
      <ModalBody className="grid gap-mol">
        <div className="grid gap-mol sm:grid-cols-2">
          <Input
            label={t("fields.title")}
            value={form.title}
            onChange={(event) =>
              setForm((prev) => {
                const title = event.target.value;
                return {
                  ...prev,
                  title,
                  slug: slugTouched ? prev.slug : slugifyDraft(title),
                };
              })
            }
          />
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
        </div>

        <div className="grid gap-mol sm:grid-cols-2">
          <Input
            label={t("fields.titleFa")}
            value={form.titleFa}
            onChange={(event) => setForm((prev) => ({ ...prev, titleFa: event.target.value }))}
          />
          <Input
            label={t("fields.description")}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>

        <div className="grid gap-mol sm:grid-cols-2">
          <Select
            label={t("fields.type")}
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value as ShopPageType }))
            }
            options={[
              { value: "landing", label: t("types.landing") },
              { value: "search", label: t("types.search") },
            ]}
          />
          <Select
            label={t("fields.status")}
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, status: event.target.value as ShopPageStatus }))
            }
            options={[
              { value: "draft", label: t("status.draft") },
              { value: "published", label: t("status.published") },
            ]}
          />
        </div>

        <div className="grid gap-mol sm:grid-cols-2">
          <Input
            label={t("fields.mapsCategorySlug")}
            hint={t("fields.mapsCategorySlugHint")}
            value={form.mapsCategorySlug}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, mapsCategorySlug: event.target.value }))
            }
            textDirection="ltr"
          />
          <div className="flex items-end pb-1">
            <Checkbox
              label={t("fields.isMain")}
              hint={t("fields.isMainHint")}
              checked={form.isMain}
              onChange={(event) => setForm((prev) => ({ ...prev, isMain: event.target.checked }))}
            />
          </div>
        </div>

        <JsonField
          label={t("fields.filters")}
          hint={t("fields.filtersHint")}
          value={form.filters}
          onChange={(value) => setForm((prev) => ({ ...prev, filters: value }))}
        />

        <JsonField
          label={t("fields.pinnedProductIds")}
          hint={t("fields.pinnedProductIdsHint")}
          value={form.pinnedProductIds}
          onChange={(value) => setForm((prev) => ({ ...prev, pinnedProductIds: value }))}
        />

        <JsonField
          label={t("fields.blocks")}
          hint={t("fields.blocksHint")}
          value={form.blocks}
          onChange={(value) => setForm((prev) => ({ ...prev, blocks: value }))}
        />

        <div className="grid gap-mol sm:grid-cols-2">
          <Input
            label={t("fields.seoTitle")}
            value={form.seoTitle}
            onChange={(event) => setForm((prev) => ({ ...prev, seoTitle: event.target.value }))}
          />
          <Input
            label={t("fields.seoDescription")}
            value={form.seoDescription}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, seoDescription: event.target.value }))
            }
          />
        </div>

        <Input
          label={t("fields.seoImageId")}
          hint={t("fields.seoImageIdHint")}
          value={form.seoImageId}
          onChange={(event) => setForm((prev) => ({ ...prev, seoImageId: event.target.value }))}
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

export function AdminShopPagesPanel() {
  const t = useTranslations("admin.shopPages");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "shop_pages.view", user.role);
  const canManage = hasPermission(user.permissions, "shop_pages.manage", user.role);
  const { data, isLoading, isError } = useShopPages();
  const deleteShopPage = useDeleteShopPage();

  const [draftFilters, setDraftFilters] = useState<ShopPageFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<ShopPageFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedPage, setSelectedPage] = useState<ShopPageDto | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = appliedFilters.q.trim().toLowerCase();

    return data.filter((page) => {
      if (q) {
        const haystack = `${page.title} ${page.slug} ${page.mapsCategorySlug ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (appliedFilters.type && page.type !== appliedFilters.type) return false;
      if (appliedFilters.status && page.status !== appliedFilters.status) return false;
      if (appliedFilters.isMain === "true" && !page.isMain) return false;
      if (appliedFilters.isMain === "false" && page.isMain) return false;
      return true;
    });
  }, [data, appliedFilters]);

  function openCreate() {
    setModalMode("create");
    setSelectedPage(null);
    setModalOpen(true);
  }

  function openEdit(page: ShopPageDto) {
    setModalMode("edit");
    setSelectedPage(page);
    setModalOpen(true);
  }

  async function onDelete(page: ShopPageDto) {
    if (!window.confirm(t("confirmDelete", { title: page.title }))) return;
    try {
      await deleteShopPage.mutateAsync(page.id);
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
            <Select
              label={t("fields.type")}
              value={draftFilters.type}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  type: event.target.value as ShopPageFilters["type"],
                }))
              }
              options={[
                { value: "", label: t("filters.all") },
                { value: "landing", label: t("types.landing") },
                { value: "search", label: t("types.search") },
              ]}
            />
            <Select
              label={t("fields.status")}
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  status: event.target.value as ShopPageFilters["status"],
                }))
              }
              options={[
                { value: "", label: t("filters.all") },
                { value: "draft", label: t("status.draft") },
                { value: "published", label: t("status.published") },
              ]}
            />
            <Select
              label={t("fields.isMain")}
              value={draftFilters.isMain}
              onChange={(event) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  isMain: event.target.value as ShopPageFilters["isMain"],
                }))
              }
              options={[
                { value: "", label: t("filters.all") },
                { value: "true", label: t("filters.mainOnly") },
                { value: "false", label: t("filters.collectionOnly") },
              ]}
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
                <Th>{t("columns.title")}</Th>
                <Th>{t("columns.slug")}</Th>
                <Th>{t("columns.type")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.isMain")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((page) => (
                <Tr key={page.id}>
                  <Td className="font-medium">{page.title}</Td>
                  <Td className="font-mono text-xs" dir="ltr">
                    {page.slug}
                  </Td>
                  <Td>
                    <Badge variant={page.type === "landing" ? "primary" : "secondary"}>
                      {t(`types.${page.type}`)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={page.status === "published" ? "success" : "neutral"}>
                      {t(`status.${page.status}`)}
                    </Badge>
                  </Td>
                  <Td>{page.isMain ? t("labels.main") : t("labels.collection")}</Td>
                  <Td>
                    <div className="flex shrink-0 items-center gap-1">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(page)}
                            className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                            aria-label={t("actions.edit")}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(page)}
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

      <AdminAuditHistory entityType="shop_page" />

      {canManage ? (
        <ShopPageFormModal
          open={modalOpen}
          mode={modalMode}
          page={selectedPage}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </AdminPageShell>
  );
}
