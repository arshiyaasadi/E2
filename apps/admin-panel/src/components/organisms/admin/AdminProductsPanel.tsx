"use client";

import { useEffect, useMemo, useState } from "react";
import { Cloud, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  Select,
  Spinner,
  Tabs,
  Toggle,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminAuditHistory } from "@/components/organisms/admin/AdminAuditHistory";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { useBrands } from "@/features/brands/queries";
import { useCategories } from "@/features/categories/queries";
import {
  useCreateProduct,
  useDeleteProduct,
  useProductDetail,
  useProducts,
  useUpdateProduct,
} from "@/features/products/queries";
import { CategoryMultiSelect } from "@/features/products/components/CategoryMultiSelect";
import { DescriptionBlocksEditor } from "@/features/products/components/DescriptionBlocksEditor";
import { ProductPreviewModal } from "@/features/products/components/ProductPreviewModal";
import {
  ProductVariantsEditor,
  emptyVariantState,
  mapDetailToVariantForm,
  mapVariantFormToPayload,
} from "@/features/products/components/ProductVariantsEditor";
import { TagMultiSelect } from "@/features/products/components/TagMultiSelect";
import {
  ProductMediaGallery,
  type ProductGalleryItem,
} from "@/features/products/components/ProductMediaGallery";
import { useTags } from "@/features/tags/queries";
import { ImageUpload, MEDIA_FOLDERS, type ImageUploadValue } from "@/features/media";
import { handleApiError } from "@/lib/api/client";
import { hasPermission } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import type { DescriptionBlock, ProductDto, ProductStatus, ProductType } from "@/types/domain";

const emptyImage: ImageUploadValue = { mediaId: null, url: null };

const META_ROBOTS_OPTIONS = [
  { value: "index,follow", label: "index, follow" },
  { value: "noindex,follow", label: "noindex, follow" },
  { value: "index,nofollow", label: "index, nofollow" },
  { value: "noindex,nofollow", label: "noindex, nofollow" },
];

interface ProductFormState {
  title: string;
  slug: string;
  description: string;
  descriptionBlocks: DescriptionBlock[];
  productType: ProductType;
  status: ProductStatus;
  categoryId: string;
  categoryIds: string[];
  tagIds: string[];
  brandId: string;
  basePrice: string;
  comparePrice: string;
  isRefundable: boolean;
  isFeatured: boolean;
  popularityScore: string;
  gallery: ProductGalleryItem[];
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: ImageUploadValue;
  canonicalUrl: string;
  metaRobots: string;
}

const emptyForm: ProductFormState = {
  title: "",
  slug: "",
  description: "",
  descriptionBlocks: [],
  productType: "physical",
  status: "draft",
  categoryId: "",
  categoryIds: [],
  tagIds: [],
  brandId: "",
  basePrice: "",
  comparePrice: "",
  isRefundable: true,
  isFeatured: false,
  popularityScore: "0",
  gallery: [],
  seoTitle: "",
  seoDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: emptyImage,
  canonicalUrl: "",
  metaRobots: "index,follow",
};

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fa-IR").format(value);
}

function statusVariant(status: ProductStatus) {
  if (status === "active") return "success";
  if (status === "archived") return "warning";
  return "neutral";
}

function ProductFormModal({
  open,
  mode,
  product,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  product: ProductDto | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin.products");
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: tags } = useTags();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: productDetail } = useProductDetail(
    mode === "edit" && product ? product.id : null,
    open && mode === "edit" && !!product,
  );

  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [variantState, setVariantState] = useState(emptyVariantState());
  const [tab, setTab] = useState("general");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("general");
    if (mode === "edit" && product) {
      setForm({
        title: product.title,
        slug: product.slug,
        description: product.description ?? "",
        descriptionBlocks: Array.isArray(product.descriptionBlocks)
          ? (product.descriptionBlocks as DescriptionBlock[])
          : [],
        productType: product.productType,
        status: product.status,
        categoryId: product.categoryId ?? "",
        categoryIds: product.categoryIds,
        tagIds: product.tagIds,
        brandId: product.brandId ?? "",
        basePrice: product.basePrice !== null ? String(product.basePrice) : "",
        comparePrice: product.comparePrice !== null ? String(product.comparePrice) : "",
        isRefundable: product.isRefundable,
        isFeatured: product.isFeatured,
        popularityScore: String(product.popularityScore ?? 0),
        gallery: product.media.map((item) => ({
          mediaId: item.id,
          url: item.url,
          media: item,
        })),
        seoTitle: product.seoTitle ?? "",
        seoDescription: product.seoDescription ?? "",
        ogTitle: product.ogTitle ?? "",
        ogDescription: product.ogDescription ?? "",
        ogImage: {
          mediaId: product.ogImageId,
          url: product.ogImage?.url ?? null,
          media: product.ogImage,
        },
        canonicalUrl: product.canonicalUrl ?? "",
        metaRobots: product.metaRobots || "index,follow",
      });
    } else {
      setForm(emptyForm);
      setVariantState(emptyVariantState());
    }
    setError(null);
  }, [open, mode, product]);

  useEffect(() => {
    if (!open || mode !== "edit" || !productDetail) return;
    setForm((prev) => ({
      ...prev,
      tagIds: productDetail.tagIds,
    }));
    setVariantState(mapDetailToVariantForm(productDetail));
  }, [open, mode, productDetail]);

  function setProductType(productType: ProductType) {
    setForm((prev) => ({
      ...prev,
      productType,
      isRefundable: productType === "digital" ? false : prev.isRefundable,
    }));
  }

  async function onSave() {
    setError(null);
    const basePrice = form.basePrice.trim() ? Number(form.basePrice) : null;
    const comparePrice = form.comparePrice.trim() ? Number(form.comparePrice) : null;
    const popularityScore = form.popularityScore.trim()
      ? Math.max(0, Math.floor(Number(form.popularityScore)))
      : 0;

    if (basePrice !== null && Number.isNaN(basePrice)) {
      setError(t("validation.invalidPrice"));
      return;
    }
    if (comparePrice !== null && Number.isNaN(comparePrice)) {
      setError(t("validation.invalidPrice"));
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      descriptionBlocks: form.descriptionBlocks,
      productType: form.productType,
      status: form.status,
      categoryId: form.categoryId || null,
      categoryIds: form.categoryIds,
      tagIds: form.tagIds,
      brandId: form.brandId || null,
      basePrice,
      comparePrice,
      isRefundable: form.isRefundable,
      isFeatured: form.isFeatured,
      popularityScore: Number.isFinite(popularityScore) ? popularityScore : 0,
      mediaIds: form.gallery.map((item) => item.mediaId),
      ...(mode === "edit" ||
      variantState.options.length > 0 ||
      variantState.variants.length > 0
        ? { variants: mapVariantFormToPayload(variantState.options, variantState.variants) }
        : {}),
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
        await createProduct.mutateAsync(payload);
      } else if (product) {
        await updateProduct.mutateAsync({ productId: product.id, input: payload });
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  const pending = createProduct.isPending || updateProduct.isPending;
  const tabItems = [
    { key: "general", label: t("tabs.general") },
    { key: "pricing", label: t("tabs.pricing") },
    { key: "catalog", label: t("tabs.catalog") },
    { key: "variants", label: t("tabs.variants") },
    { key: "media", label: t("tabs.media") },
    { key: "seo", label: t("tabs.seo") },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? t("createTitle") : t("editTitle")}
      size="full"
    >
      <ModalBody className="grid gap-mol">
        <Tabs items={tabItems} active={tab} onChange={setTab} variant="pills" />

        {tab === "general" ? (
          <div className="grid gap-mol">
            <div className="grid gap-mol sm:grid-cols-2">
              <Input
                label={t("fields.title")}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <Input
                label={t("fields.slug")}
                hint={t("fields.slugHint")}
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
            </div>

            <Input
              label={t("fields.description")}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />

            <DescriptionBlocksEditor
              label={t("fields.descriptionBlocks")}
              value={form.descriptionBlocks}
              onChange={(descriptionBlocks) => setForm((prev) => ({ ...prev, descriptionBlocks }))}
            />

            <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
              <p className="text-sm font-semibold text-foreground">{t("fields.productType")}</p>
              <p className="mt-atom-md text-xs text-muted">{t("fields.productTypeHint")}</p>
              <div className="mt-mol flex flex-wrap gap-pad-atom">
                <button
                  type="button"
                  onClick={() => setProductType("physical")}
                  className={`inline-flex items-center gap-pad-atom rounded-2xl border px-pad-mol py-pad-atom text-sm transition-colors ${
                    form.productType === "physical"
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-white/50 bg-white/40 text-muted hover:border-primary/40"
                  }`}
                >
                  <Package className="size-4" />
                  {t("types.physical")}
                </button>
                <button
                  type="button"
                  onClick={() => setProductType("digital")}
                  className={`inline-flex items-center gap-pad-atom rounded-2xl border px-pad-mol py-pad-atom text-sm transition-colors ${
                    form.productType === "digital"
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-white/50 bg-white/40 text-muted hover:border-primary/40"
                  }`}
                >
                  <Cloud className="size-4" />
                  {t("types.digital")}
                </button>
              </div>
              {form.productType === "digital" ? (
                <Alert variant="warning" className="mt-mol">
                  {t("digitalNotice")}
                </Alert>
              ) : null}
            </div>

            <Select
              label={t("fields.status")}
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as ProductStatus }))
              }
              options={[
                { value: "draft", label: t("status.draft") },
                { value: "active", label: t("status.active") },
                { value: "archived", label: t("status.archived") },
              ]}
            />
          </div>
        ) : null}

        {tab === "pricing" ? (
          <div className="grid gap-mol sm:grid-cols-2">
            <Input
              label={t("fields.basePrice")}
              type="number"
              min={0}
              value={form.basePrice}
              onChange={(event) => setForm((prev) => ({ ...prev, basePrice: event.target.value }))}
            />
            <Input
              label={t("fields.comparePrice")}
              hint={t("fields.comparePriceHint")}
              type="number"
              min={0}
              value={form.comparePrice}
              onChange={(event) => setForm((prev) => ({ ...prev, comparePrice: event.target.value }))}
            />
            <Toggle
              checked={form.isRefundable}
              onChange={(checked) => setForm((prev) => ({ ...prev, isRefundable: checked }))}
              label={t("fields.isRefundable")}
              hint={
                form.productType === "digital"
                  ? t("fields.isRefundableDigitalHint")
                  : t("fields.isRefundableHint")
              }
              disabled={form.productType === "digital"}
            />
            <Toggle
              checked={form.isFeatured}
              onChange={(checked) => setForm((prev) => ({ ...prev, isFeatured: checked }))}
              label={t("fields.isFeatured")}
              hint={t("fields.isFeaturedHint")}
            />
            <Input
              label={t("fields.popularityScore")}
              hint={t("fields.popularityScoreHint")}
              type="number"
              min={0}
              value={form.popularityScore}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, popularityScore: event.target.value }))
              }
            />
          </div>
        ) : null}

        {tab === "catalog" ? (
          <div className="grid gap-mol">
            <CategoryMultiSelect
              categories={categories ?? []}
              selectedIds={form.categoryIds}
              primaryCategoryId={form.categoryId}
              onChange={(categoryIds, categoryId) =>
                setForm((prev) => ({ ...prev, categoryIds, categoryId }))
              }
            />

            <div className="grid gap-mol sm:grid-cols-2">
              <Select
                label={t("fields.brand")}
                value={form.brandId}
                onChange={(event) => setForm((prev) => ({ ...prev, brandId: event.target.value }))}
                options={[
                  { value: "", label: t("fields.noBrand") },
                  ...(brands ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            </div>

            <TagMultiSelect
              tags={tags ?? []}
              selectedIds={form.tagIds}
              onChange={(tagIds) => setForm((prev) => ({ ...prev, tagIds }))}
            />
          </div>
        ) : null}

        {tab === "variants" ? (
          <ProductVariantsEditor
            options={variantState.options}
            variants={variantState.variants}
            onChange={setVariantState}
          />
        ) : null}

        {tab === "media" ? (
          <ProductMediaGallery
            label={t("fields.gallery")}
            hint={t("fields.galleryHint")}
            folder={MEDIA_FOLDERS.PRODUCTS}
            value={form.gallery}
            onChange={(gallery) => setForm((prev) => ({ ...prev, gallery }))}
          />
        ) : null}

        {tab === "seo" ? (
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
                folder={MEDIA_FOLDERS.PRODUCTS}
                value={form.ogImage}
                onChange={(ogImage) => setForm((prev) => ({ ...prev, ogImage }))}
              />
            </div>
          </div>
        ) : null}

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button onClick={onSave} disabled={pending || !form.title.trim()}>
          {t("actions.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AdminProductsPanel() {
  const t = useTranslations("admin.products");
  const user = useAuthUser();
  const canManage = hasPermission(user.permissions, "products.manage", user.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filters = useMemo(
    () => ({
      q: search.trim() || undefined,
      status: (statusFilter || undefined) as ProductStatus | undefined,
      productType: (typeFilter || undefined) as ProductType | undefined,
      brandId: brandFilter || undefined,
      categoryId: categoryFilter || undefined,
    }),
    [search, statusFilter, typeFilter, brandFilter, categoryFilter],
  );

  const { data: brands } = useBrands();
  const { data: categories } = useCategories();
  const { data, isLoading, isError } = useProducts(filters);
  const deleteProduct = useDeleteProduct();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProduct, setSelectedProduct] = useState<ProductDto | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ProductDto | null>(null);

  function openCreate() {
    setModalMode("create");
    setSelectedProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: ProductDto) {
    setModalMode("edit");
    setSelectedProduct(product);
    setModalOpen(true);
  }

  async function onDelete(product: ProductDto) {
    if (!window.confirm(t("confirmDelete", { title: product.title }))) return;
    try {
      await deleteProduct.mutateAsync(product.id);
    } catch (err) {
      window.alert(handleApiError(err));
    }
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
      <Card className="grid gap-mol sm:grid-cols-2 lg:grid-cols-5">
        <Input
          label={t("filters.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("filters.searchPlaceholder")}
        />
        <Select
          label={t("filters.status")}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.all") },
            { value: "draft", label: t("status.draft") },
            { value: "active", label: t("status.active") },
            { value: "archived", label: t("status.archived") },
          ]}
        />
        <Select
          label={t("filters.type")}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.all") },
            { value: "physical", label: t("types.physical") },
            { value: "digital", label: t("types.digital") },
          ]}
        />
        <Select
          label={t("filters.brand")}
          value={brandFilter}
          onChange={(event) => setBrandFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.all") },
            ...(brands ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <Select
          label={t("filters.category")}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          options={[
            { value: "", label: t("filters.all") },
            ...(categories ?? []).map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-mol-md">
          <Spinner />
        </div>
      ) : isError ? (
        <Alert variant="danger">{t("error")}</Alert>
      ) : !data?.length ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("columns.image")}</Th>
                <Th>{t("columns.title")}</Th>
                <Th>{t("columns.type")}</Th>
                <Th>{t("columns.status")}</Th>
                <Th>{t("columns.price")}</Th>
                <Th>{t("columns.brand")}</Th>
                <Th>{t("columns.category")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {data.map((product) => (
                <Tr key={product.id}>
                  <Td>
                    {product.featuredImage?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.featuredImage.url}
                        alt={product.title}
                        className="size-12 rounded-xl object-cover ring-1 ring-white/60"
                      />
                    ) : (
                      <Badge variant="neutral">{t("noImage")}</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="font-medium">{product.title}</div>
                    <div className="font-mono text-xs text-muted">{product.slug}</div>
                  </Td>
                  <Td>
                    <Badge variant={product.productType === "digital" ? "secondary" : "primary"}>
                      {product.productType === "digital" ? t("types.digital") : t("types.physical")}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={statusVariant(product.status)}>
                      {t(`status.${product.status}`)}
                    </Badge>
                  </Td>
                  <Td>{formatPrice(product.basePrice)}</Td>
                  <Td>{product.brand?.name ?? "—"}</Td>
                  <Td>
                    {product.categories.length
                      ? product.categories.map((item) => item.name).join("، ")
                      : product.category?.name ?? "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-pad-atom">
                      <Button size="sm" variant="outline" onClick={() => setPreviewProduct(product)}>
                        {t("actions.view")}
                      </Button>
                      {canManage ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                            {t("actions.edit")}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => onDelete(product)}>
                            {t("actions.delete")}
                          </Button>
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

      <AdminAuditHistory entityType="product" />

      {canManage ? (
        <ProductFormModal
          open={modalOpen}
          mode={modalMode}
          product={selectedProduct}
          onClose={() => setModalOpen(false)}
        />
      ) : null}

      <ProductPreviewModal
        open={!!previewProduct}
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
      />
    </AdminPageShell>
  );
}
