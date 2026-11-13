"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Download,
  ImageOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { Lightbox } from "@/features/products/components/Lightbox";
import { Stage2Form } from "@/features/products/components/Stage2Form";
import { formatTomanFromRial, parseRialInput } from "@/features/products/money";
import {
  useDeleteMediaMutation,
  useDeleteProductMutation,
  usePatchProductMutation,
  useProductQuery,
  useReplaceMediaMutation,
} from "@/features/products/queries";
import type { VariantRow } from "@/features/products/types";
import { ROUTES } from "@/config/routes";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type DetailTab = "overview" | "catalog" | "price";

function parseTab(value: string | null): DetailTab {
  if (value === "catalog" || value === "price") return value;
  return "overview";
}

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <CardHeader className="pb-pad-atom">
        <CardTitle className="text-sm font-semibold text-muted">{title}</CardTitle>
      </CardHeader>
      <CardBody className="pt-pad-atom">{children}</CardBody>
    </Card>
  );
}

function DetailInner({ productId }: { productId: string }) {
  const t = useTranslations("products.detail");
  const tStatus = useTranslations("products.status");
  const tForm = useTranslations("products.form");
  const tErr = useTranslations("products.errors");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const query = useProductQuery(productId);
  const patch = usePatchProductMutation(productId);
  const remove = useDeleteProductMutation();
  const replaceMedia = useReplaceMediaMutation();
  const deleteMedia = useDeleteMediaMutation();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceRaw, setPriceRaw] = useState("");
  const [variantPrices, setVariantPrices] = useState<VariantRow[]>([]);
  const [priceMessage, setPriceMessage] = useState<string | null>(null);
  const [priceSaving, setPriceSaving] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const product = query.data;

  useEffect(() => {
    if (!product) return;
    setPriceRaw(String(product.priceRial ?? 0));
    setVariantPrices(product.variants?.rows ?? []);
  }, [product]);

  const setTab = useCallback(
    (next: DetailTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (query.isLoading && !product) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!product) {
    return (
      <AppTemplate title={t("title")}>
        <Alert variant="error">{tForm("newCaption")}</Alert>
      </AppTemplate>
    );
  }

  const coverId = product.mediaIds[0] ?? null;
  const coverUrl = coverId ? `/api/v1/media/${coverId}` : null;
  const hasVariants = Boolean(product.variants && product.variants.rows.length > 0);
  const basePrice = parseRialInput(priceRaw) ?? 0;

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: t("tabOverview") },
    { id: "catalog", label: t("tabCatalog") },
    { id: "price", label: t("tabPrice") },
  ];

  async function downloadPhoto(fileId: string) {
    const url = `/api/v1/media/${fileId}`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `pishe-${fileId.slice(0, 8)}.jpg`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function handleReplaceFile(file: File) {
    if (!replaceTargetId) return;
    setError(null);
    try {
      await replaceMedia.mutateAsync({ fileId: replaceTargetId, file });
      await query.refetch();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setReplaceTargetId(null);
    }
  }

  async function handleDeletePhoto(fileId: string) {
    if (!product) return;
    setError(null);
    if (product.mediaIds.length <= 1) {
      setError(tErr("lastPhoto"));
      return;
    }
    try {
      await deleteMedia.mutateAsync({ fileId, productId });
      await query.refetch();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function savePrices() {
    if (!product) return;
    setError(null);
    setPriceMessage(null);
    if (parseRialInput(priceRaw) === null) {
      setError(tErr("priceRequired"));
      return;
    }
    const price = parseRialInput(priceRaw) ?? 0;
    setPriceSaving(true);
    try {
      const nextVariants = product.variants
        ? {
            ...product.variants,
            rows: variantPrices,
          }
        : undefined;
      await patch.mutateAsync({
        priceRial: price,
        ...(nextVariants ? { variants: nextVariants } : {}),
      });
      setPriceMessage(t("priceSaved"));
      await query.refetch();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setPriceSaving(false);
    }
  }

  return (
    <AppTemplate title={product.title || t("title")}>
      <div className="flex flex-col gap-mol-md">
        <div className="flex gap-atom rounded-2xl border border-border bg-surface p-0.5 shadow-sm">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "flex-1 rounded-[0.9rem] px-pad-atom py-pad-atom-md text-sm transition-colors",
                tab === item.id
                  ? "bg-primary font-semibold text-white shadow-sm"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {tab === "overview" ? (
          <>
            <SectionCard title={t("sectionOverview")}>
              <div className="flex gap-mol">
                <button
                  type="button"
                  disabled={!coverUrl}
                  onClick={() => coverUrl && setLightboxIndex(0)}
                  className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 shadow-sm"
                  aria-label={t("openPhoto")}
                >
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-muted">
                      <ImageOff className="size-6" aria-hidden />
                    </span>
                  )}
                </button>

                <div className="flex min-w-0 flex-1 flex-col gap-atom">
                  <div className="flex flex-wrap items-start justify-between gap-atom-md">
                    <h2 className="text-lg font-semibold leading-snug text-foreground">
                      {product.title}
                    </h2>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-pad-atom-md py-0.5 text-xs font-medium",
                        product.status === "complete"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning",
                      )}
                    >
                      {tStatus(product.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted">{t("basePrice")}</p>
                    <p className="text-base font-semibold text-foreground">
                      {formatTomanFromRial(product.priceRial)} تومان
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-mol border-t border-border pt-mol">
                <p className="mb-atom text-xs font-medium text-muted">
                  {t("description")}
                </p>
                {product.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {product.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{t("noDescription")}</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t("sectionMore")}>
              <p className="mb-mol text-xs text-muted">{t("moreSoonHint")}</p>
              <dl className="grid gap-atom-md text-sm">
                <div className="flex items-center justify-between gap-mol rounded-xl border border-dashed border-border bg-surface-2/40 px-pad-mol py-pad-atom-md">
                  <dt className="text-muted">{t("brand")}</dt>
                  <dd className="text-xs font-medium text-primary">{t("moreSoon")}</dd>
                </div>
                <div className="flex items-center justify-between gap-mol rounded-xl border border-dashed border-border bg-surface-2/40 px-pad-mol py-pad-atom-md">
                  <dt className="text-muted">{t("category")}</dt>
                  <dd className="text-xs font-medium text-primary">{t("moreSoon")}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title={t("sectionActions")}>
              <div className="flex flex-col gap-atom-md">
                <Button
                  fullWidth
                  onClick={() => router.push(ROUTES.productEdit(productId))}
                >
                  <Pencil className="size-4" aria-hidden />
                  {t("edit")}
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setTab("catalog")}
                >
                  {hasVariants ? tForm("editDetails") : t("createVariants")}
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("delete")}
                </Button>
              </div>
            </SectionCard>
          </>
        ) : null}

        {tab === "catalog" ? (
          <SectionCard title={t("tabCatalog")}>
            <div className="flex flex-col gap-mol-md">
              <div>
                <p className="mb-atom-md text-xs font-medium text-muted">
                  {t("sectionGallery")} ·{" "}
                  {t("photoCount", { count: product.mediaIds.length })}
                </p>
                {product.mediaIds.length === 0 ? (
                  <div className="flex flex-col items-center gap-atom rounded-xl border border-dashed border-border bg-surface-2/50 py-pad-org text-muted">
                    <ImageOff className="size-8" aria-hidden />
                    <p className="text-sm">{t("photosEmpty")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-atom-md sm:grid-cols-3">
                    {product.mediaIds.map((fileId, i) => (
                      <div
                        key={fileId}
                        className={cn(
                          "overflow-hidden rounded-xl border border-border bg-surface-2 shadow-sm",
                          i === 0 && "ring-2 ring-primary/40",
                        )}
                      >
                        <button
                          type="button"
                          className="relative aspect-square w-full"
                          onClick={() => setLightboxIndex(i)}
                          aria-label={t("openPhoto")}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/v1/media/${fileId}`}
                            alt=""
                            className="size-full object-cover"
                          />
                          {i === 0 ? (
                            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[10px] text-white">
                              {tForm("coverStar")}
                            </span>
                          ) : null}
                        </button>
                        <div className="flex border-t border-border">
                          <button
                            type="button"
                            className="flex flex-1 items-center justify-center gap-atom py-pad-atom text-[10px] text-muted hover:bg-surface hover:text-foreground"
                            onClick={() => void downloadPhoto(fileId)}
                          >
                            <Download className="size-3.5" aria-hidden />
                            {t("downloadPhoto")}
                          </button>
                          <button
                            type="button"
                            className="flex flex-1 items-center justify-center gap-atom border-s border-border py-pad-atom text-[10px] text-muted hover:bg-surface hover:text-foreground"
                            onClick={() => {
                              setReplaceTargetId(fileId);
                              replaceInputRef.current?.click();
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            {t("editPhoto")}
                          </button>
                          <button
                            type="button"
                            className="flex flex-1 items-center justify-center gap-atom border-s border-border py-pad-atom text-[10px] text-danger hover:bg-danger/10"
                            onClick={() => void handleDeletePhoto(fileId)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            {t("deletePhoto")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleReplaceFile(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="border-t border-border pt-mol">
                <p className="mb-atom-md text-xs font-medium text-muted">
                  {t("sectionVariants")}
                </p>
                {hasVariants ? (
                  <ul className="flex flex-col gap-atom-md">
                    {product.variants!.rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-mol rounded-xl border border-border bg-surface-2/40 px-pad-mol py-pad-atom-md shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {[row.attr1Value, row.attr2Value]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                          <p className="text-xs text-muted">
                            {row.active
                              ? t("variantActive")
                              : t("variantInactive")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-foreground">
                          {formatTomanFromRial(row.priceRial)} تومان
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col gap-mol">
                    <p className="text-sm text-muted">{t("noVariants")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {t("createVariants")}
                    </p>
                    <Stage2Form
                      productId={productId}
                      embedded
                      hidePrice
                      onSaved={() => {
                        void query.refetch();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {tab === "price" ? (
          <SectionCard title={t("tabPrice")}>
            <div className="flex flex-col gap-mol">
              <div>
                <p className="mb-atom text-sm font-medium text-foreground">
                  {t("basePrice")}
                </p>
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  className="text-end"
                  value={priceRaw}
                  onChange={(e) => setPriceRaw(e.target.value)}
                />
                <p className="mt-atom text-sm text-muted">
                  {formatTomanFromRial(basePrice)} تومان
                </p>
              </div>

              {hasVariants ? (
                <div className="flex flex-col gap-atom-md border-t border-border pt-mol">
                  <p className="text-sm font-medium text-foreground">
                    {t("variantPrices")}
                  </p>
                  {variantPrices.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-mol rounded-xl border border-border bg-surface-2/40 px-pad-mol py-pad-atom-md"
                    >
                      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {[row.attr1Value, row.attr2Value]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                      <Input
                        className="w-32 text-end"
                        dir="ltr"
                        inputMode="numeric"
                        value={String(row.priceRial)}
                        onChange={(e) => {
                          const n = parseRialInput(e.target.value);
                          if (n === null) return;
                          setVariantPrices((rows) =>
                            rows.map((r) =>
                              r.id === row.id ? { ...r, priceRial: n } : r,
                            ),
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-pad-mol py-pad-mol text-center text-sm text-muted">
                  {t("noVariants")}
                </p>
              )}

              {priceMessage ? (
                <Alert variant="success">{priceMessage}</Alert>
              ) : null}

              <Button
                fullWidth
                loading={priceSaving || patch.isPending}
                onClick={() => void savePrices()}
              >
                {t("priceSave")}
              </Button>
            </div>
          </SectionCard>
        ) : null}
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-pad-mol sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-pad-mol-md shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
            <p className="mb-mol text-sm text-foreground">{t("deleteConfirm")}</p>
            <div className="flex gap-atom-md">
              <Button
                variant="danger"
                fullWidth
                loading={remove.isPending}
                onClick={async () => {
                  try {
                    await remove.mutateAsync(productId);
                    router.replace(ROUTES.products);
                  } catch (err) {
                    setError(handleApiError(err));
                    setConfirmDelete(false);
                  }
                }}
              >
                {t("confirmDelete")}
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setConfirmDelete(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxIndex !== null ? (
        <Lightbox
          productId={productId}
          mediaIds={product.mediaIds}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onSetCover={async (fileId) => {
            const next = [
              fileId,
              ...product.mediaIds.filter((id) => id !== fileId),
            ];
            await patch.mutateAsync({ mediaIds: next });
            await query.refetch();
          }}
          onChanged={() => {
            void query.refetch();
          }}
        />
      ) : null}

    </AppTemplate>
  );
}

export function ProductDetailContent({ productId }: { productId: string }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <DetailInner productId={productId} />
    </Suspense>
  );
}
