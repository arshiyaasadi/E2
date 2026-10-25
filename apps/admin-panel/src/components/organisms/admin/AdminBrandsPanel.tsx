"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, ImageIcon, Pencil, Trash2 } from "lucide-react";
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
import {
  useBrands,
  useCreateBrand,
  useDeleteBrand,
  useUpdateBrand,
} from "@/features/brands/queries";
import { ImageUpload, MEDIA_FOLDERS, type ImageUploadValue } from "@/features/media";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";
import type { BrandDto } from "@/types/domain";

interface BrandFormState {
  name: string;
  nameFa: string;
  slug: string;
  image: ImageUploadValue;
}

type BrandFilters = {
  q: string;
  name: string;
  nameFa: string;
  slug: string;
};

const emptyImage: ImageUploadValue = { mediaId: null, url: null };

const emptyForm: BrandFormState = {
  name: "",
  nameFa: "",
  slug: "",
  image: emptyImage,
};

const emptyFilters: BrandFilters = {
  q: "",
  name: "",
  nameFa: "",
  slug: "",
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

function BrandThumb({ url, name }: { url?: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-white/60"
      />
    );
  }

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/55 text-muted ring-1 ring-white/60">
      <ImageIcon className="size-4" />
    </div>
  );
}

function BrandFormModal({
  open,
  mode,
  brand,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  brand: BrandDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.brands");
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const [form, setForm] = useState<BrandFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && brand) {
      setForm({
        name: brand.name,
        nameFa: brand.nameFa,
        slug: brand.slug,
        image: {
          mediaId: brand.imageId,
          url: brand.image?.url ?? null,
          media: brand.image,
        },
      });
    } else {
      setForm(emptyForm);
    }
    setSlugTouched(mode === "edit");
    setError(null);
  }, [open, mode, brand]);

  async function onSave() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      nameFa: form.nameFa.trim(),
      slug: form.slug.trim() || undefined,
      imageId: form.image.mediaId,
    };

    try {
      if (mode === "create") {
        await createBrand.mutateAsync(payload);
      } else if (brand) {
        await updateBrand.mutateAsync({ brandId: brand.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createBrand.isPending || updateBrand.isPending;
  const canSave = form.name.trim() && form.nameFa.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="lg"
      className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
    >
      <ModalBody className="flex-1 overflow-y-auto grid gap-mol">
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

        <ImageUpload
          label={t("fields.image")}
          hint={t("fields.imageHint")}
          folder={MEDIA_FOLDERS.BRANDS}
          value={form.image}
          onChange={(image) => setForm((prev) => ({ ...prev, image }))}
        />

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </ModalBody>
      <ModalFooter className="sticky bottom-0 bg-surface/95 backdrop-blur">
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

function BrandDetailsModal({
  brand,
  onClose,
}: {
  brand: BrandDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.brands");

  return (
    <Modal open={!!brand} onClose={onClose} title={t("detailsTitle")} size="lg">
      <ModalBody className="grid gap-mol">
        {brand ? (
          <>
            {brand.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.image.url}
                alt={brand.name}
                className="h-48 w-full rounded-2xl object-cover ring-1 ring-white/60"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-border bg-white/40 text-muted">
                <ImageIcon className="size-8" />
              </div>
            )}

            <div className="grid gap-mol sm:grid-cols-2">
              <Input label={t("fields.nameEn")} value={brand.name} readOnly textDirection="ltr" />
              <Input label={t("fields.nameFa")} value={brand.nameFa} readOnly />
              <Input label={t("fields.slug")} value={brand.slug} readOnly textDirection="ltr" />
              <Input
                label={t("fields.createdAt")}
                value={new Date(brand.createdAt).toLocaleDateString("fa-IR")}
                readOnly
              />
            </div>
          </>
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

export function AdminBrandsPanel() {
  const t = useTranslations("admin.brands");
  const user = useAuthUser();
  const canView = hasPermission(user.permissions, "products.view", user.role);
  const canManage = hasPermission(user.permissions, "products.manage", user.role);
  const { data, isLoading, isError } = useBrands();
  const deleteBrand = useDeleteBrand();

  const [draftFilters, setDraftFilters] = useState<BrandFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<BrandFilters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedBrand, setSelectedBrand] = useState<BrandDto | null>(null);
  const [viewBrand, setViewBrand] = useState<BrandDto | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = appliedFilters.q.trim().toLowerCase();
    const name = appliedFilters.name.trim().toLowerCase();
    const nameFa = appliedFilters.nameFa.trim().toLowerCase();
    const slug = appliedFilters.slug.trim().toLowerCase();

    return data.filter((brand) => {
      if (q) {
        const haystack = `${brand.name} ${brand.nameFa} ${brand.slug}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (name && !brand.name.toLowerCase().includes(name)) return false;
      if (nameFa && !brand.nameFa.toLowerCase().includes(nameFa)) return false;
      if (slug && !brand.slug.toLowerCase().includes(slug)) return false;
      return true;
    });
  }, [data, appliedFilters]);

  function openCreate() {
    setModalMode("create");
    setSelectedBrand(null);
    setModalOpen(true);
  }

  function openEdit(brand: BrandDto) {
    setModalMode("edit");
    setSelectedBrand(brand);
    setModalOpen(true);
  }

  async function onDelete(brand: BrandDto) {
    if (!window.confirm(t("confirmDelete", { name: brand.nameFa || brand.name }))) return;
    try {
      await deleteBrand.mutateAsync(brand.id);
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
                <Th>{t("columns.brand")}</Th>
                <Th>{t("columns.nameFa")}</Th>
                <Th>{t("columns.slug")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((brand) => (
                <Tr key={brand.id}>
                  <Td>
                    <div className="flex items-center gap-pad-atom-md">
                      <BrandThumb url={brand.image?.url} name={brand.name} />
                      <span className="font-medium" dir="ltr">
                        {brand.name}
                      </span>
                    </div>
                  </Td>
                  <Td>{brand.nameFa}</Td>
                  <Td className="font-mono text-xs" dir="ltr">
                    {brand.slug}
                  </Td>
                  <Td>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewBrand(brand)}
                        className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                        aria-label={t("actions.view")}
                      >
                        <Eye className="size-4" />
                      </button>
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(brand)}
                            className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/65 p-2 text-muted transition hover:text-foreground"
                            aria-label={t("actions.edit")}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(brand)}
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

      <AdminAuditHistory entityType="brand" />

      {canManage ? (
        <BrandFormModal
          open={modalOpen}
          mode={modalMode}
          brand={selectedBrand}
          onClose={() => setModalOpen(false)}
        />
      ) : null}

      <BrandDetailsModal brand={viewBrand} onClose={() => setViewBrand(null)} />
    </AdminPageShell>
  );
}
