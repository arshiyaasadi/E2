"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  useCategoriesQuery,
  useCategoryQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  usePatchCategoryMutation,
} from "@/features/products/queries";
import type { CategoryKind } from "@/features/products/types";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { ROUTES } from "@/config/routes";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export function CategoriesListContent() {
  const t = useTranslations("products");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const router = useRouter();
  const search = useSearchParams();
  const kind = (search.get("kind") === "virtual" ? "virtual" : "real") as CategoryKind;
  const query = useCategoriesQuery();
  const remove = useDeleteCategoryMutation();

  const items = useMemo(
    () => (query.data ?? []).filter((c) => c.kind === kind),
    [query.data, kind],
  );
  const hasItems = items.length > 0;
  const addHref = `${ROUTES.categoryNew}?kind=${kind}`;

  return (
    <AppTemplate
      crumbs={[
        { label: tNav("products"), href: ROUTES.products },
        { label: tHub("categoriesTitle") },
      ]}
      denseMain
    >
      {hasItems ? (
        <BottomActions>
          <BottomActionButton
            icon={Plus}
            label={t("categories.add")}
            onClick={() => router.push(addHref)}
          />
        </BottomActions>
      ) : null}

      <div className="mb-mol flex gap-atom rounded-xl border border-border bg-surface p-1">
        {(["real", "virtual"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={cn(
              "flex-1 rounded-lg px-pad-mol py-pad-atom text-sm transition-colors",
              kind === k
                ? "bg-primary/10 font-semibold text-primary"
                : "text-muted hover:text-foreground",
            )}
            onClick={() =>
              router.replace(`${ROUTES.categories}?kind=${k}`)
            }
          >
            {k === "real" ? t("categories.kindReal") : t("categories.kindVirtual")}
          </button>
        ))}
      </div>

      <p className="mb-mol text-sm text-muted">
        {kind === "real"
          ? t("categories.kindRealHint")
          : t("categories.kindVirtualHint")}
      </p>

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : !hasItems ? (
        <EmptyState
          title={t("categories.empty")}
          body={t("categories.emptyBody")}
          action={
            <Button variant="outline" onClick={() => router.push(addHref)}>
              <Plus className="size-4" aria-hidden />
              {t("categories.add")}
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-atom-md">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-mol rounded-2xl border border-border bg-surface p-pad-mol shadow-sm"
            >
              <Link
                href={ROUTES.categoryEdit(category.id)}
                className="flex min-w-0 flex-1 items-center gap-mol"
              >
                <div className="size-12 overflow-hidden rounded-xl border border-border bg-surface-2">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {category.name}
                  </span>
                  {category.parentName ? (
                    <span className="mt-atom block truncate text-xs text-muted">
                      {t("categories.parentOf", { name: category.parentName })}
                    </span>
                  ) : null}
                </span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("categories.delete")}
                onClick={() => void remove.mutateAsync(category.id)}
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

function CategoryForm({
  mode,
  categoryId,
}: {
  mode: "create" | "edit";
  categoryId?: string;
}) {
  const t = useTranslations("products");
  const tForm = useTranslations("products.form");
  const tNav = useTranslations("products.nav");
  const tHub = useTranslations("products.hub");
  const router = useRouter();
  const search = useSearchParams();
  const formId = useId();
  const existing = useCategoryQuery(categoryId);
  const all = useCategoriesQuery();
  const create = useCreateCategoryMutation();
  const patch = usePatchCategoryMutation(categoryId ?? "");

  const initialKind = (
    search.get("kind") === "virtual" ? "virtual" : "real"
  ) as CategoryKind;

  const [kind, setKind] = useState<CategoryKind>(initialKind);
  const [name, setName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [englishOpen, setEnglishOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [descOpen, setDescOpen] = useState(false);
  const [parentId, setParentId] = useState<string>("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !existing.data) return;
    setKind(existing.data.kind);
    setName(existing.data.name);
    setDescription(existing.data.description);
    setDescOpen(Boolean(existing.data.description));
    setParentId(existing.data.parentId ?? "");
    setImageId(existing.data.imageId);
    setImageUrl(existing.data.imageUrl);
  }, [mode, existing.data]);

  const realParents = useMemo(
    () =>
      (all.data ?? []).filter(
        (c) => c.kind === "real" && c.id !== categoryId,
      ),
    [all.data, categoryId],
  );

  async function save() {
    setError(null);
    if (name.trim().length < 1) {
      setError(t("categories.nameRequired"));
      return;
    }
    setPending(true);
    try {
      // englishName is UI-only for now; persist when API supports it.
      void englishName;
      if (mode === "create") {
        await create.mutateAsync({
          name: name.trim(),
          kind,
          parentId: kind === "real" && parentId ? parentId : null,
          description: description.trim(),
          imageId,
        });
      } else if (categoryId) {
        await patch.mutateAsync({
          name: name.trim(),
          parentId: kind === "real" ? parentId || null : null,
          description: description.trim(),
          imageId,
        });
      }
      router.push(`${ROUTES.categories}?kind=${kind}`);
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
        { label: tHub("categoriesTitle"), href: ROUTES.categories },
        {
          label:
            mode === "create" ? t("categories.add") : t("categories.edit"),
        },
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
        {mode === "create" ? (
          <FormSection title={t("categories.kind")}>
            <div className="flex gap-atom">
              {(["real", "virtual"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={cn(
                    "flex-1 rounded-xl border px-pad-mol py-pad-atom text-sm",
                    kind === k
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border text-muted",
                  )}
                  onClick={() => setKind(k)}
                >
                  {k === "real"
                    ? t("categories.kindReal")
                    : t("categories.kindVirtual")}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {kind === "real"
                ? t("categories.kindRealHint")
                : t("categories.kindVirtualHint")}
            </p>
          </FormSection>
        ) : null}

        <FormSection title={t("categories.name")} titleHtmlFor="cat-name" required>
          <Input
            id="cat-name"
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
              label={t("categories.description")}
              closeLabel={tForm("optionalFieldClose")}
              onClose={() => {
                setDescOpen(false);
                setDescription("");
              }}
            >
              <Textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
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
                id="cat-english-name"
                dir="ltr"
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                maxLength={150}
                placeholder={tForm("englishNamePlaceholder")}
              />
            </OptionalFieldPanel>
          ) : null}
        </FormSection>

        {kind === "real" ? (
          <FormSection title={t("categories.parent")} titleHtmlFor="cat-parent">
            <select
              id="cat-parent"
              className="h-control w-full rounded-md border border-border bg-surface px-pad-mol text-sm text-foreground"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">{t("categories.noParent")}</option>
              {realParents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormSection>
        ) : null}

        <FormSection title={t("categories.photo")}>
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

export function NewCategoryPage() {
  return <CategoryForm mode="create" />;
}

export function EditCategoryPage({ categoryId }: { categoryId: string }) {
  return <CategoryForm mode="edit" categoryId={categoryId} />;
}
