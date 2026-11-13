"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleHelp, RotateCcw, Save, Sparkles } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Button } from "@/components/atoms/Button";
import { Textarea } from "@/components/atoms/Textarea";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { FormSection } from "@/components/molecules/FormSection";
import { HelpDialog } from "@/components/molecules/HelpDialog";
import {
  OptionalFieldChip,
  OptionalFieldPanel,
} from "@/components/molecules/OptionalField";
import { CategoryPickerModal } from "@/features/products/components/CategoryPickerModal";
import {
  PhotoUploader,
  readyMediaIds,
  type PhotoItem,
} from "@/features/products/components/PhotoUploader";
import { useUnsavedChangesGuard } from "@/features/products/hooks/use-unsaved-changes-guard";
import {
  useBrandsQuery,
  useCategoriesQuery,
} from "@/features/products/queries";
import {
  findSeedCategoryPath,
  SEED_CATEGORY_TREE,
} from "@/features/products/seed/category-tree";
import type { ProductStatus } from "@/features/products/types";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { useHeaderStatus } from "@/providers/HeaderStatusProvider";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export type Stage1Values = {
  title: string;
  priceRial: number;
  description: string;
  mediaIds: string[];
  brandId: string | null;
  categoryId: string | null;
  groupCategoryIds: string[];
};

type FormTab = "basic" | "specs";

type DraftSnapshot = {
  title: string;
  description: string;
  englishName: string;
  descOpen: boolean;
  englishOpen: boolean;
  photos: PhotoItem[];
  brandId: string;
  categoryId: string;
  groupCategoryIds: string[];
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightG: string;
};

function clonePhotos(photos: PhotoItem[]): PhotoItem[] {
  return photos.map((p) => ({ ...p }));
}

function snapshotKey(s: DraftSnapshot): string {
  return JSON.stringify({
    title: s.title,
    description: s.description,
    englishName: s.englishName,
    brandId: s.brandId,
    categoryId: s.categoryId,
    groupCategoryIds: s.groupCategoryIds,
    lengthCm: s.lengthCm,
    widthCm: s.widthCm,
    heightCm: s.heightCm,
    weightG: s.weightG,
    photos: s.photos.map((p) => ({
      localId: p.localId,
      fileId: p.fileId ?? null,
      status: p.status,
    })),
  });
}

function digitsOnly(raw: string): string {
  return raw.replace(/[^\d.]/g, "");
}

export function Stage1Form({
  initial,
  productStatus,
  submitLabel,
  completeLabel,
  onSubmit,
  onComplete,
}: {
  initial?: Partial<Stage1Values> & { photos?: PhotoItem[] };
  productStatus?: ProductStatus | null;
  submitLabel: string;
  completeLabel: string;
  onSubmit: (values: Stage1Values) => Promise<void>;
  onComplete: (values: Stage1Values) => Promise<void>;
}) {
  const t = useTranslations("products.form");
  const tStatus = useTranslations("products.status");
  const tPicker = useTranslations("products.categoryPicker");
  const tCatalog = useTranslations("products");
  const tErr = useTranslations("products.errors");
  const brands = useBrandsQuery();
  const categories = useCategoriesQuery();

  const initialSnapshot = useMemo<DraftSnapshot>(
    () => ({
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      englishName: "",
      descOpen: Boolean(initial?.description),
      englishOpen: false,
      photos: clonePhotos(initial?.photos ?? []),
      brandId: initial?.brandId ?? "",
      categoryId: initial?.categoryId ?? "",
      groupCategoryIds: [...(initial?.groupCategoryIds ?? [])],
      lengthCm: "",
      widthCm: "",
      heightCm: "",
      weightG: "",
    }),
    // Intentional: baseline seed from first mount props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [tab, setTab] = useState<FormTab>("basic");
  const [baseline, setBaseline] = useState<DraftSnapshot>(initialSnapshot);
  const [title, setTitle] = useState(initialSnapshot.title);
  const [description, setDescription] = useState(initialSnapshot.description);
  const [descOpen, setDescOpen] = useState(initialSnapshot.descOpen);
  const [englishName, setEnglishName] = useState(initialSnapshot.englishName);
  const [englishOpen, setEnglishOpen] = useState(initialSnapshot.englishOpen);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialSnapshot.photos);
  const [brandId, setBrandId] = useState(initialSnapshot.brandId);
  const [categoryId, setCategoryId] = useState(initialSnapshot.categoryId);
  const [groupCategoryIds, setGroupCategoryIds] = useState<string[]>(
    initialSnapshot.groupCategoryIds,
  );
  const [lengthCm, setLengthCm] = useState(initialSnapshot.lengthCm);
  const [widthCm, setWidthCm] = useState(initialSnapshot.widthCm);
  const [heightCm, setHeightCm] = useState(initialSnapshot.heightCm);
  const [weightG, setWeightG] = useState(initialSnapshot.weightG);
  const [formError, setFormError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "complete" | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [photosHelpOpen, setPhotosHelpOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  const currentSnapshot = useMemo<DraftSnapshot>(
    () => ({
      title,
      description,
      englishName,
      descOpen,
      englishOpen,
      photos,
      brandId,
      categoryId,
      groupCategoryIds,
      lengthCm,
      widthCm,
      heightCm,
      weightG,
    }),
    [
      title,
      description,
      englishName,
      descOpen,
      englishOpen,
      photos,
      brandId,
      categoryId,
      groupCategoryIds,
      lengthCm,
      widthCm,
      heightCm,
      weightG,
    ],
  );

  const dirty = snapshotKey(currentSnapshot) !== snapshotKey(baseline);
  const leaveGuard = useUnsavedChangesGuard(dirty);

  const statusLabel = useMemo(() => {
    if (!productStatus) return tStatus("draft");
    return tStatus(productStatus);
  }, [productStatus, tStatus]);

  const headerStatus = useMemo(() => {
    if (dirty) {
      return { label: tStatus("dirty"), tone: "warning" as const };
    }
    if (draftNotice) {
      return { label: draftNotice, tone: "success" as const };
    }
    return { label: statusLabel, tone: "muted" as const };
  }, [dirty, draftNotice, statusLabel, tStatus]);

  useHeaderStatus(headerStatus);

  const virtualCategories = useMemo(
    () => (categories.data ?? []).filter((c) => c.kind === "virtual"),
    [categories.data],
  );

  const categoryPathLabel = useMemo(() => {
    if (!categoryId) return null;
    const path = findSeedCategoryPath(SEED_CATEGORY_TREE, categoryId);
    if (path?.length) return path.map((n) => n.name).join(" / ");
    const fromApi = (categories.data ?? []).find((c) => c.id === categoryId);
    return fromApi?.name ?? null;
  }, [categoryId, categories.data]);

  const cover = photos.find((p) => p.status === "ready") ?? photos[0];

  const canSubmit = useMemo(() => {
    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed.length > 100) return false;
    if (description.length > 1000) return false;
    if (photos.some((p) => p.status === "uploading" || p.status === "error")) {
      return false;
    }
    const mediaIds = readyMediaIds(photos);
    if (mediaIds.length < 1 || mediaIds.length > 10) return false;
    return true;
  }, [title, description, photos]);

  function applySnapshot(s: DraftSnapshot) {
    setTitle(s.title);
    setDescription(s.description);
    setEnglishName(s.englishName);
    setDescOpen(s.descOpen);
    setEnglishOpen(s.englishOpen);
    setPhotos(clonePhotos(s.photos));
    setBrandId(s.brandId);
    setCategoryId(s.categoryId);
    setGroupCategoryIds([...s.groupCategoryIds]);
    setLengthCm(s.lengthCm);
    setWidthCm(s.widthCm);
    setHeightCm(s.heightCm);
    setWeightG(s.weightG);
  }

  function saveDraftBaseline() {
    const next = {
      ...currentSnapshot,
      photos: clonePhotos(currentSnapshot.photos),
      groupCategoryIds: [...currentSnapshot.groupCategoryIds],
    };
    setBaseline(next);
    setDraftNotice(t("draftSaved"));
  }

  function restoreDraftBaseline() {
    applySnapshot(baseline);
    setDraftNotice(null);
    setFormError(null);
    setPhotoError(null);
  }

  function validate(): Stage1Values | null {
    setFormError(null);
    setPhotoError(null);

    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      setFormError(tErr("titleRequired"));
      return null;
    }

    if (photos.some((p) => p.status === "uploading")) {
      setPhotoError(tErr("photoUploading"));
      return null;
    }
    if (photos.some((p) => p.status === "error")) {
      setPhotoError(tErr("photoHasErrors"));
      return null;
    }

    const mediaIds = readyMediaIds(photos);
    if (mediaIds.length < 1) {
      setPhotoError(tErr("photoRequired"));
      return null;
    }
    if (mediaIds.length > 10) {
      setPhotoError(tErr("photoMax"));
      return null;
    }

    if (description.length > 1000) {
      setFormError(tErr("descriptionLong"));
      return null;
    }

    return {
      title: trimmed,
      priceRial: initial?.priceRial ?? 0,
      description: description.trim(),
      mediaIds,
      brandId: brandId || null,
      categoryId: categoryId || null,
      groupCategoryIds,
    };
  }

  async function run(
    kind: "save" | "complete",
    action: (values: Stage1Values) => Promise<void>,
  ) {
    const values = validate();
    if (!values) return;
    setPending(kind);
    try {
      await action(values);
      setBaseline({
        ...currentSnapshot,
        photos: clonePhotos(currentSnapshot.photos),
        groupCategoryIds: [...currentSnapshot.groupCategoryIds],
      });
      setDraftNotice(null);
    } catch (error) {
      setFormError(handleApiError(error));
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;
  const actionsDisabled = !canSubmit || busy;

  return (
    <form
      className="flex flex-col gap-mol-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        void run("save", onSubmit);
      }}
    >
      <BottomActions>
        <BottomActionButton
          icon={RotateCcw}
          label={t("draftRestore")}
          variant="ghost"
          disabled={!dirty || busy}
          onClick={restoreDraftBaseline}
        />
        <BottomActionButton
          icon={Save}
          label={t("draftSave")}
          variant="outline"
          disabled={busy}
          onClick={saveDraftBaseline}
        />
        <BottomActionButton
          icon={Save}
          label={submitLabel}
          variant="outline"
          loading={pending === "save"}
          disabled={actionsDisabled || pending === "complete"}
          onClick={() => void run("save", onSubmit)}
        />
        <BottomActionButton
          icon={Sparkles}
          label={completeLabel}
          loading={pending === "complete"}
          disabled={actionsDisabled || pending === "save"}
          onClick={() => void run("complete", onComplete)}
        />
      </BottomActions>

      <div
        role="tablist"
        aria-label={t("tabsAria")}
        className="flex gap-mol border-0"
      >
        {(
          [
            { id: "basic" as const, label: t("tabBasic") },
            { id: "specs" as const, label: t("tabSpecs") },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative pb-atom text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
              {active ? (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        key={tab}
        role="tabpanel"
        className="flex animate-fade-rise flex-col gap-mol-md"
      >
        {tab === "basic" ? (
          <>
            <FormSection
              help={
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-atom rounded-full px-pad-atom py-0.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  aria-label={t("guideOpen")}
                >
                  <CircleHelp className="size-5" aria-hidden />
                  <span>{t("guideTitle")}</span>
                </button>
              }
            >
              <Input
                id="product-title"
                label={`${t("title")} *`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                maxLength={100}
                autoFocus
                required
                aria-required
                invalid={title.trim().length > 0 && title.trim().length < 2}
              />

              {(!descOpen || !englishOpen) && (
                <div className="flex flex-wrap items-center gap-atom-md">
                  {!descOpen ? (
                    <OptionalFieldChip
                      label={t("descriptionAdd")}
                      onOpen={() => setDescOpen(true)}
                    />
                  ) : null}
                  {!englishOpen ? (
                    <OptionalFieldChip
                      label={t("englishNameAdd")}
                      onOpen={() => setEnglishOpen(true)}
                    />
                  ) : null}
                </div>
              )}

              {descOpen ? (
                <OptionalFieldPanel
                  label={t("descriptionAdd")}
                  closeLabel={t("optionalFieldClose")}
                  onClose={() => {
                    setDescOpen(false);
                    setDescription("");
                  }}
                >
                  <Textarea
                    id="product-description"
                    label={t("descriptionAdd")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    maxLength={1000}
                    rows={2}
                    className="min-h-0 [&_textarea]:min-h-0 [&_textarea]:resize-none"
                  />
                </OptionalFieldPanel>
              ) : null}

              {englishOpen ? (
                <OptionalFieldPanel
                  label={t("englishNameAdd")}
                  closeLabel={t("optionalFieldClose")}
                  onClose={() => {
                    setEnglishOpen(false);
                    setEnglishName("");
                  }}
                >
                  <Input
                    id="product-english-name"
                    label={t("englishName")}
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder={t("englishNamePlaceholder")}
                    maxLength={100}
                    dir="ltr"
                    className="[&_input]:text-start"
                  />
                </OptionalFieldPanel>
              ) : null}
            </FormSection>

            <FormSection
              title={t("photos")}
              required
              help={
                <button
                  type="button"
                  onClick={() => setPhotosHelpOpen(true)}
                  className="rounded-full p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  aria-label={t("photosHelpOpen")}
                >
                  <CircleHelp className="size-5" aria-hidden />
                </button>
              }
            >
              <PhotoUploader
                photos={photos}
                onChange={setPhotos}
                error={photoError}
                mock
              />
            </FormSection>
          </>
        ) : (
          <>
            <FormSection>
              <div className="flex items-center gap-mol">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
                  {cover?.localPreview || cover?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover.localPreview || cover.url || ""}
                      alt={t("productCardCover")}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {title.trim() || t("untitledProduct")}
                  </p>
                  {englishName.trim() ? (
                    <p
                      className="truncate text-sm text-muted"
                      dir="ltr"
                    >
                      {englishName.trim()}
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection bodyClassName="gap-mol">
              <div className="flex flex-col gap-atom">
                <Label>{tCatalog("categories.kindReal")}</Label>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(true)}
                  className="flex w-full flex-col gap-atom rounded-md border border-border bg-surface px-pad-mol py-pad-atom-md text-start transition-colors hover:border-primary/40"
                >
                  <span className="text-sm font-medium text-foreground">
                    {categoryPathLabel
                      ? tPicker("change")
                      : tPicker("pick")}
                  </span>
                  <span className="text-sm text-muted">
                    {categoryPathLabel || tPicker("none")}
                  </span>
                </button>
              </div>

              <div className="relative">
                <select
                  id="product-brand"
                  className={cn(
                    "h-control w-full appearance-none rounded-md border border-border bg-surface px-pad-mol pt-4 pb-1 text-sm text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary",
                  )}
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">{t("brandNone")}</option>
                  {(brands.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute start-pad-mol top-1.5 text-[11px] font-medium text-primary">
                  {tCatalog("brands.name")}
                </span>
              </div>

              {virtualCategories.length > 0 ? (
                <div className="flex flex-col gap-atom">
                  <Label>{tCatalog("categories.kindVirtual")}</Label>
                  <ul className="flex flex-col gap-atom">
                    {virtualCategories.map((c) => {
                      const checked = groupCategoryIds.includes(c.id);
                      return (
                        <li key={c.id}>
                          <label className="flex items-center gap-atom-md text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setGroupCategoryIds((prev) =>
                                  checked
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id],
                                );
                              }}
                            />
                            {c.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </FormSection>

            <FormSection title={t("dimensionsTitle")} bodyClassName="gap-mol">
              <div className="grid gap-mol md:grid-cols-2">
                <div className="flex flex-col gap-atom">
                  <Label>{t("dimensionsPackaging")}</Label>
                  <div className="grid grid-cols-3 gap-atom-md">
                    <Input
                      id="product-length"
                      label={t("dimensionsLength")}
                      suffix={t("dimensionsUnitCm")}
                      inputMode="decimal"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(digitsOnly(e.target.value))}
                    />
                    <Input
                      id="product-width"
                      label={t("dimensionsWidth")}
                      suffix={t("dimensionsUnitCm")}
                      inputMode="decimal"
                      value={widthCm}
                      onChange={(e) => setWidthCm(digitsOnly(e.target.value))}
                    />
                    <Input
                      id="product-height"
                      label={t("dimensionsHeight")}
                      suffix={t("dimensionsUnitCm")}
                      inputMode="decimal"
                      value={heightCm}
                      onChange={(e) => setHeightCm(digitsOnly(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-atom">
                  <Label>{t("dimensionsWeightLabel")}</Label>
                  <Input
                    id="product-weight"
                    label={t("dimensionsWeight")}
                    suffix={t("dimensionsUnitG")}
                    inputMode="decimal"
                    value={weightG}
                    onChange={(e) => setWeightG(digitsOnly(e.target.value))}
                  />
                </div>
              </div>
            </FormSection>
          </>
        )}
      </div>

      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <CategoryPickerModal
        open={categoryModalOpen}
        selectedId={categoryId || null}
        onClose={() => setCategoryModalOpen(false)}
        onConfirm={(id) => setCategoryId(id)}
      />

      <ConfirmDialog
        open={Boolean(leaveGuard.pendingHref)}
        title={t("leaveTitle")}
        body={t("leaveBody")}
        confirmLabel={t("leaveConfirm")}
        cancelLabel={t("leaveCancel")}
        danger
        onCancel={leaveGuard.clearPending}
        onConfirm={leaveGuard.confirmLeave}
      />

      <HelpDialog
        open={guideOpen}
        title={t("guideTitle")}
        closeLabel={t("helpClose")}
        onClose={() => setGuideOpen(false)}
      >
        <p>{t("guideBody")}</p>
      </HelpDialog>

      <HelpDialog
        open={photosHelpOpen}
        title={t("photosHelpTitle")}
        closeLabel={t("helpClose")}
        onClose={() => setPhotosHelpOpen(false)}
      >
        <ul className="flex list-disc flex-col gap-atom ps-pad-mol">
          <li>{t("photosHelpLine1")}</li>
          <li>{t("photosHelpLine2")}</li>
          <li>{t("photosHelpLine3")}</li>
          <li>{t("photosHelpLine4")}</li>
        </ul>
      </HelpDialog>
    </form>
  );
}
