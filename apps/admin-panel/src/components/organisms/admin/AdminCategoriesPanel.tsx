"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Spinner,
  Tabs,
} from "@/components/atoms";
import { CategoryBannerFields } from "@/components/organisms/admin/categories/CategoryBannerFields";
import { CategoryFiltersFields } from "@/components/organisms/admin/categories/CategoryFiltersFields";
import {
  CategoryGalleryField,
  type CategoryGalleryItem,
} from "@/components/organisms/admin/categories/CategoryGalleryField";
import {
  CategoryPinnedProductsField,
  type PinnedProductDraft,
} from "@/components/organisms/admin/categories/CategoryPinnedProductsField";
import { ParentCategorySearchSelect } from "@/components/organisms/admin/categories/ParentCategorySearchSelect";
import { CategoryTreePreview } from "@/components/organisms/admin/categories/CategoryTreePreview";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { useBrands } from "@/features/brands/queries";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/queries";
import { ImageUpload, MEDIA_FOLDERS, type ImageUploadValue } from "@/features/media";
import { useTags } from "@/features/tags/queries";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type {
  CategoryDto,
  CategoryKind,
  CategoryPageSettings,
  ShopPageFilters,
} from "@/types/domain";

interface CategoryFormState {
  name: string;
  nameFa: string;
  slug: string;
  kind: CategoryKind;
  menuVisible: boolean;
  description: string;
  pageSettings: CategoryPageSettings;
  filters: ShopPageFilters;
  parentId: string;
  gallery: CategoryGalleryItem[];
  pinnedProducts: PinnedProductDraft[];
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: ImageUploadValue;
  canonicalUrl: string;
  metaRobots: string;
}

type CategoryModalTab = "general" | "merch" | "seo";

const emptyImage: ImageUploadValue = { mediaId: null, url: null };

const emptyForm: CategoryFormState = {
  name: "",
  nameFa: "",
  slug: "",
  kind: "real",
  menuVisible: true,
  description: "",
  pageSettings: { bannerEnabled: true, showProductCount: true },
  filters: {},
  parentId: "",
  gallery: [],
  pinnedProducts: [],
  seoTitle: "",
  seoDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: emptyImage,
  canonicalUrl: "",
  metaRobots: "index,follow",
};

const META_ROBOTS_OPTIONS = [
  { value: "index,follow", label: "index, follow" },
  { value: "noindex,follow", label: "noindex, follow" },
  { value: "index,nofollow", label: "index, nofollow" },
  { value: "noindex,nofollow", label: "noindex, nofollow" },
];

function slugifyDraft(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function CategoryFormModal({
  open,
  mode,
  category,
  categories,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  category: CategoryDto | null;
  categories: CategoryDto[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.categories");
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: brands = [] } = useBrands();
  const { data: tags = [] } = useTags();
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryModalTab>("general");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      setForm({
        name: category.name,
        nameFa: category.nameFa,
        slug: category.slug,
        kind: category.kind ?? "real",
        menuVisible: category.menuVisible ?? true,
        description: category.description ?? "",
        pageSettings: category.pageSettings ?? { bannerEnabled: true, showProductCount: true },
        filters: category.filters ?? {},
        parentId: category.parentId ?? "",
        gallery: (category.gallery ?? []).map((item) => ({
          mediaId: item.mediaId,
          url: item.media.url,
          media: item.media,
        })),
        pinnedProducts: (category.pinnedProducts ?? []).map((p) => ({
          productId: p.productId,
          title: p.title,
          slug: p.slug,
          status: p.status,
        })),
        seoTitle: category.seoTitle ?? "",
        seoDescription: category.seoDescription ?? "",
        ogTitle: category.ogTitle ?? "",
        ogDescription: category.ogDescription ?? "",
        ogImage: {
          mediaId: category.ogImageId,
          url: category.ogImage?.url ?? null,
          media: category.ogImage,
        },
        canonicalUrl: category.canonicalUrl ?? "",
        metaRobots: category.metaRobots || "index,follow",
      });
    } else {
      setForm(emptyForm);
    }
    setActiveTab("general");
    setSlugTouched(mode === "edit");
    setError(null);
  }, [open, mode, category]);

  async function onSave() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      nameFa: form.nameFa.trim(),
      slug: form.slug.trim() || undefined,
      kind: form.kind,
      menuVisible: form.menuVisible,
      description: form.description.trim() || null,
      pageSettings: form.pageSettings,
      filters: form.filters,
      parentId: form.parentId || null,
      galleryMediaIds: form.gallery.map((g) => g.mediaId),
      pinnedProductIds: form.pinnedProducts.map((p) => p.productId),
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      ogTitle: form.ogTitle.trim() || null,
      ogDescription: form.ogDescription.trim() || null,
      ogImageId: form.ogImage.mediaId,
      canonicalUrl: form.canonicalUrl.trim() || null,
      metaRobots: form.metaRobots,
    };

    try {
      if (mode === "create") {
        await createCategory.mutateAsync(payload);
      } else if (category) {
        await updateCategory.mutateAsync({ categoryId: category.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createCategory.isPending || updateCategory.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="xl"
      className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden"
    >
      <ModalBody className="flex-1 overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border bg-surface/95 px-mol-md py-pad-atom-md backdrop-blur">
          <Tabs
            variant="boxed"
            active={activeTab}
            onChange={(key) => setActiveTab(key as CategoryModalTab)}
            items={[
              { key: "general", label: t("tabs.general") },
              { key: "merch", label: t("tabs.merch") },
              { key: "seo", label: t("tabs.seo") },
            ]}
          />
        </div>

        <div className="grid gap-mol px-mol-md py-pad-mol">
          {activeTab === "general" ? (
            <>
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

              <div className="grid gap-mol sm:grid-cols-2">
                <Select
                  label={t("fields.kind")}
                  value={form.kind}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      kind: event.target.value as CategoryKind,
                    }))
                  }
                  options={[
                    { value: "real", label: t("kind.real") },
                    { value: "virtual", label: t("kind.virtual") },
                  ]}
                />
                <div className="flex items-end pb-2">
                  <Checkbox
                    label={t("fields.menuVisible")}
                    checked={form.menuVisible}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, menuVisible: event.target.checked }))
                    }
                  />
                </div>
              </div>

              <ParentCategorySearchSelect
                label={t("fields.parent")}
                hint={t("fields.parentHint")}
                emptyLabel={t("fields.noParent")}
                categories={categories}
                value={form.parentId}
                excludeId={category?.id}
                onChange={(parentId) => setForm((prev) => ({ ...prev, parentId }))}
              />

              <Input
                label={t("fields.description")}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />

              <CategoryBannerFields
                value={form.pageSettings}
                onChange={(pageSettings) => setForm((prev) => ({ ...prev, pageSettings }))}
              />

              <CategoryGalleryField
                label={t("fields.gallery")}
                hint={t("fields.galleryHint")}
                value={form.gallery}
                onChange={(gallery) => setForm((prev) => ({ ...prev, gallery }))}
              />
            </>
          ) : null}

          {activeTab === "merch" ? (
            <>
              <CategoryFiltersFields
                value={form.filters}
                onChange={(filters) => setForm((prev) => ({ ...prev, filters }))}
                categories={categories}
                brands={brands}
                tags={tags}
              />
              <CategoryPinnedProductsField
                value={form.pinnedProducts}
                onChange={(pinnedProducts) => setForm((prev) => ({ ...prev, pinnedProducts }))}
              />
            </>
          ) : null}

          {activeTab === "seo" ? (
            <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
              <h4 className="text-sm font-semibold text-foreground">{t("seo.sectionTitle")}</h4>
              <p className="mt-atom-md text-xs text-muted">{t("seo.sectionHint")}</p>
              <div className="mt-mol grid gap-mol">
                <div className="grid gap-mol sm:grid-cols-2">
                  <Input
                    label={t("seo.fields.title")}
                    value={form.seoTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, seoTitle: event.target.value }))}
                  />
                  <Input
                    label={t("seo.fields.canonicalUrl")}
                    value={form.canonicalUrl}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, canonicalUrl: event.target.value }))
                    }
                    textDirection="ltr"
                  />
                </div>
                <Input
                  label={t("seo.fields.description")}
                  value={form.seoDescription}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, seoDescription: event.target.value }))
                  }
                />
                <Select
                  label={t("seo.fields.metaRobots")}
                  value={form.metaRobots}
                  onChange={(event) => setForm((prev) => ({ ...prev, metaRobots: event.target.value }))}
                  options={META_ROBOTS_OPTIONS}
                />
                <div className="grid gap-mol sm:grid-cols-2">
                  <Input
                    label={t("seo.fields.ogTitle")}
                    value={form.ogTitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, ogTitle: event.target.value }))}
                  />
                  <Input
                    label={t("seo.fields.ogDescription")}
                    value={form.ogDescription}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, ogDescription: event.target.value }))
                    }
                  />
                </div>
                <ImageUpload
                  label={t("seo.fields.ogImage")}
                  hint={t("seo.fields.ogImageHint")}
                  folder={MEDIA_FOLDERS.CATEGORIES}
                  value={form.ogImage}
                  onChange={(ogImage) => setForm((prev) => ({ ...prev, ogImage }))}
                />
              </div>
            </div>
          ) : null}

          {error ? <Alert variant="danger">{error}</Alert> : null}
        </div>
      </ModalBody>
      <ModalFooter className="sticky bottom-0 bg-surface/95 backdrop-blur">
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button loading={pending} onClick={onSave}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function CategoryDetailsModal({
  category,
  categories,
  onClose,
}: {
  category: CategoryDto | null;
  categories: CategoryDto[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.categories");
  const parent = categories.find((item) => item.id === category?.parentId) ?? null;

  return (
    <Modal open={!!category} onClose={onClose} title={t("detailsTitle")} size="lg">
      <ModalBody className="grid gap-mol">
        {category ? (
          <>
            {category.gallery?.[0]?.media.url || category.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.gallery?.[0]?.media.url ?? category.image?.url ?? ""}
                alt={category.name}
                className="h-48 w-full rounded-2xl object-cover ring-1 ring-white/60"
              />
            ) : null}

            <div className="grid gap-mol sm:grid-cols-2">
              <Input label={t("fields.nameEn")} value={category.name} readOnly textDirection="ltr" />
              <Input label={t("fields.nameFa")} value={category.nameFa} readOnly />
              <Input label={t("fields.slug")} value={category.slug} readOnly textDirection="ltr" />
              <Input
                label={t("fields.collectionUrl")}
                value={category.collectionPath ?? `/collection/${category.slug}`}
                readOnly
                textDirection="ltr"
              />
              <Input
                label={t("fields.kind")}
                value={category.kind === "virtual" ? t("kind.virtual") : t("kind.real")}
                readOnly
              />
              <Input
                label={t("fields.menuVisible")}
                value={category.menuVisible ? t("menu.visible") : t("menu.hidden")}
                readOnly
              />
              <Input
                label={t("fields.parent")}
                value={parent ? `${parent.name} | ${parent.nameFa}` : t("fields.noParent")}
                readOnly
              />
            </div>

            {category.kind === "virtual" ? (
              <Alert variant="info">{t("kind.virtualHint")}</Alert>
            ) : null}

            <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
              <p className="text-sm font-semibold">{t("details.filtersTitle")}</p>
              <pre className="mt-pad-atom overflow-x-auto text-xs text-muted" dir="ltr">
                {JSON.stringify(category.filters ?? {}, null, 2)}
              </pre>
            </div>

            <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
              <p className="text-sm font-semibold">{t("details.pinnedTitle")}</p>
              {(category.pinnedProducts ?? []).length ? (
                <ul className="mt-pad-atom space-y-1 text-sm">
                  {category.pinnedProducts.map((p) => (
                    <li key={p.productId}>{p.title}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-pad-atom text-xs text-muted">{t("details.noPinned")}</p>
              )}
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

function CategoryDeleteConfirmModal({
  category,
  pending,
  onClose,
  onConfirm,
}: {
  category: CategoryDto | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const t = useTranslations("admin.categories");

  return (
    <Modal open={!!category} onClose={onClose} title={t("deleteModal.title")} size="md">
      <ModalBody className="grid gap-mol">
        <Alert variant="danger">{t("deleteModal.description", { name: category?.name ?? "" })}</Alert>
      </ModalBody>
      <ModalFooter className="sticky bottom-0 bg-surface/95 backdrop-blur">
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button variant="danger" loading={pending} onClick={() => void onConfirm()}>
          {t("actions.delete")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminCategoriesPanel() {
  const t = useTranslations("admin.categories");
  const authUser = useAuthUser();
  const canManage = hasPermission(authUser.permissions, "products.manage", authUser.role);
  const { data, isLoading, isError } = useCategories();
  const deleteCategory = useDeleteCategory();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<CategoryDto | null>(null);
  const [detailCategory, setDetailCategory] = useState<CategoryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDto | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function openCreate() {
    setModalMode("create");
    setSelectedCategory(null);
    setModalOpen(true);
  }

  function openEdit(category: CategoryDto) {
    setModalMode("edit");
    setSelectedCategory(category);
    setSelectedId(category.id);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteCategory.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
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
      {isLoading ? (
        <div className="flex justify-center py-mol-lg">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <Alert variant="danger">{t("error")}</Alert>
      ) : !(data ?? []).length ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-mol-md">
          <CategoryTreePreview
            categories={data ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={canManage ? openEdit : undefined}
            onView={setDetailCategory}
            onDelete={canManage ? setDeleteTarget : undefined}
          />
          <AdminAuditHistory entityType="category" />
        </div>
      )}

      <CategoryFormModal
        open={modalOpen}
        mode={modalMode}
        category={selectedCategory}
        categories={data ?? []}
        onClose={() => setModalOpen(false)}
      />
      <CategoryDetailsModal
        category={detailCategory}
        categories={data ?? []}
        onClose={() => setDetailCategory(null)}
      />
      <CategoryDeleteConfirmModal
        category={deleteTarget}
        pending={deleteCategory.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </AdminPageShell>
  );
}
