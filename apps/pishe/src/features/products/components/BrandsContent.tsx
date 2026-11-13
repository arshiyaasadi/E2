"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Save, Trash2 } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { Textarea } from "@/components/atoms/Textarea";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { EmptyState } from "@/components/molecules/EmptyState";
import { FormSection } from "@/components/molecules/FormSection";
import {
  OptionalFieldChip,
  OptionalFieldPanel,
} from "@/components/molecules/OptionalField";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { SingleImageField } from "@/features/media/components/SingleImageField";
import {
  useBrandQuery,
  useBrandsQuery,
  useCreateBrandMutation,
  useDeleteBrandMutation,
  usePatchBrandMutation,
} from "@/features/products/queries";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { ROUTES } from "@/config/routes";
import { handleApiError } from "@/lib/api/client";

export function BrandsListContent() {
  const t = useTranslations("products");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const router = useRouter();
  const query = useBrandsQuery();
  const remove = useDeleteBrandMutation();
  const brands = query.data ?? [];
  const hasItems = brands.length > 0;

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: tHub("brandsTitle") },
      ]}
      denseMain
    >
      {hasItems ? (
        <BottomActions>
          <BottomActionButton
            icon={Plus}
            label={t("brands.add")}
            onClick={() => router.push(ROUTES.brandNew)}
          />
        </BottomActions>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : !hasItems ? (
        <EmptyState
          title={t("brands.empty")}
          body={t("brands.emptyBody")}
          action={
            <Button
              variant="outline"
              onClick={() => router.push(ROUTES.brandNew)}
            >
              <Plus className="size-4" aria-hidden />
              {t("brands.add")}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-atom-md">
          {brands.map((brand) => (
            <li
              key={brand.id}
              className="flex items-center gap-mol rounded-2xl border border-border bg-surface p-pad-mol shadow-sm"
            >
              <Link
                href={ROUTES.brandEdit(brand.id)}
                className="flex min-w-0 flex-1 items-center gap-mol"
              >
                <div className="size-12 overflow-hidden rounded-xl border border-border bg-surface-2">
                  {brand.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {brand.name}
                  </span>
                  {brand.description ? (
                    <span className="mt-atom block truncate text-xs text-muted">
                      {brand.description}
                    </span>
                  ) : null}
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("brands.delete")}
                onClick={() => void remove.mutateAsync(brand.id)}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppTemplate>
  );
}

function BrandForm({
  mode,
  brandId,
}: {
  mode: "create" | "edit";
  brandId?: string;
}) {
  const t = useTranslations("products");
  const tForm = useTranslations("products.form");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const router = useRouter();
  const formId = useId();
  const existing = useBrandQuery(brandId);
  const create = useCreateBrandMutation();
  const patch = usePatchBrandMutation(brandId ?? "");

  const [name, setName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [englishOpen, setEnglishOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [descOpen, setDescOpen] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !existing.data) return;
    setName(existing.data.name);
    setDescription(existing.data.description);
    setDescOpen(Boolean(existing.data.description));
    setImageId(existing.data.imageId);
    setImageUrl(existing.data.imageUrl);
  }, [mode, existing.data]);

  async function save() {
    setError(null);
    if (name.trim().length < 1) {
      setError(t("brands.nameRequired"));
      return;
    }
    setPending(true);
    try {
      // englishName is UI-only for now; persist when API supports it.
      void englishName;
      if (mode === "create") {
        await create.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          imageId,
        });
      } else if (brandId) {
        await patch.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          imageId,
        });
      }
      router.push(ROUTES.brands);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setPending(false);
    }
  }

  if (mode === "edit" && existing.isLoading && !existing.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: tHub("brandsTitle"), href: ROUTES.brands },
        { label: mode === "create" ? t("brands.add") : t("brands.edit") },
      ]}
      denseMain
    >
      <BottomActions>
        <BottomActionButton
          icon={Save}
          label={tForm("saveChanges")}
          type="submit"
          form={formId}
          loading={pending}
          disabled={pending}
        />
      </BottomActions>

      <form
        id={formId}
        className="flex flex-col gap-mol-md"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <FormSection title={t("brands.name")} titleHtmlFor="brand-name" required>
          <Input
            id="brand-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={150}
            required
          />

          {(!descOpen || !englishOpen) && (
            <div className="flex flex-wrap items-center gap-atom-md">
              {!descOpen ? (
                <OptionalFieldChip
                  label={tForm("descriptionAdd")}
                  onOpen={() => setDescOpen(true)}
                />
              ) : null}
              {!englishOpen ? (
                <OptionalFieldChip
                  label={tForm("englishNameAdd")}
                  onOpen={() => setEnglishOpen(true)}
                />
              ) : null}
            </div>
          )}

          {descOpen ? (
            <OptionalFieldPanel
              label={t("brands.description")}
              closeLabel={tForm("optionalFieldClose")}
              onClose={() => {
                setDescOpen(false);
                setDescription("");
              }}
            >
              <Textarea
                id="brand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder={tForm("descriptionPlaceholder")}
              />
            </OptionalFieldPanel>
          ) : null}

          {englishOpen ? (
            <OptionalFieldPanel
              label={tForm("englishName")}
              closeLabel={tForm("optionalFieldClose")}
              onClose={() => {
                setEnglishOpen(false);
                setEnglishName("");
              }}
            >
              <Input
                id="brand-english-name"
                dir="ltr"
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                maxLength={150}
                placeholder={tForm("englishNamePlaceholder")}
              />
            </OptionalFieldPanel>
          ) : null}
        </FormSection>

        <FormSection title={t("brands.photo")}>
          <SingleImageField
            imageId={imageId}
            imageUrl={imageUrl}
            onChange={({ imageId: nextId, imageUrl: nextUrl }) => {
              setImageId(nextId);
              setImageUrl(nextUrl);
            }}
          />
        </FormSection>

        {error ? <Alert variant="error">{error}</Alert> : null}
      </form>
    </AppTemplate>
  );
}

export function NewBrandPage() {
  return <BrandForm mode="create" />;
}

export function EditBrandPage({ brandId }: { brandId: string }) {
  return <BrandForm mode="edit" brandId={brandId} />;
}
