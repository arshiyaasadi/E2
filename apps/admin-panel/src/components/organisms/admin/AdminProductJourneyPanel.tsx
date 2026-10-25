"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Tabs,
  Toggle,
} from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import { AdminPageShell } from "@/components/organisms/admin/AdminPageShell";
import { OPTION_NAME_SUGGESTIONS } from "@/features/products/mocks/seed";
import {
  createDraftProduct,
  regenerateVariantMatrix,
  updateProductBasic,
  updateProductPricing,
  updateProductVariants,
  useJourneyProduct,
  useJourneyProducts,
  useProductsMockState,
} from "@/features/products/mocks/store";
import type {
  MockGalleryItem,
  MockVariantOption,
  MockVariantRow,
} from "@/features/products/mocks/types";
import { newId } from "@/features/mocks/create-store";

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fa-IR").format(value);
}

export function AdminProductJourneyPanel() {
  const t = useTranslations("admin.productJourney");
  const { categories, galleryPool } = useProductsMockState();
  const products = useJourneyProducts();
  const [productId, setProductId] = useState<string | null>(products[0]?.id ?? null);
  const product = useJourneyProduct(productId);
  const [tab, setTab] = useState("basic");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [gallery, setGallery] = useState<MockGalleryItem[]>([]);

  const [options, setOptions] = useState<MockVariantOption[]>([]);
  const [variants, setVariants] = useState<MockVariantRow[]>([]);

  const [basePrice, setBasePrice] = useState("");
  const [upliftEdits, setUpliftEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!product) {
      setTitle("");
      setCategoryId("");
      setGallery([]);
      setOptions([]);
      setVariants([]);
      setBasePrice("");
      setUpliftEdits({});
      return;
    }
    setTitle(product.title);
    setCategoryId(product.categoryId ?? "");
    setGallery(product.gallery);
    setOptions(product.options);
    setVariants(product.variants);
    setBasePrice(product.basePrice !== null ? String(product.basePrice) : "");
    setUpliftEdits(
      Object.fromEntries(product.variants.map((v) => [v.key, String(v.uplift)])),
    );
  }, [product]);

  const tabItems = useMemo(
    () => [
      { key: "basic", label: t("tabs.basic") },
      { key: "variants", label: t("tabs.variants"), disabled: !productId },
      { key: "pricing", label: t("tabs.pricing"), disabled: !productId },
      { key: "more", label: t("tabs.more"), disabled: !productId },
    ],
    [productId, t],
  );

  const priceGroups = useMemo(() => {
    const base = Number(basePrice) || 0;
    const enabled = variants.filter((v) => v.enabled);
    const map = new Map<number, MockVariantRow[]>();
    for (const row of enabled) {
      const uplift = Number(upliftEdits[row.key] ?? row.uplift) || 0;
      const price = base + uplift;
      const list = map.get(price) ?? [];
      list.push(row);
      map.set(price, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [variants, upliftEdits, basePrice]);

  function togglePoolImage(item: MockGalleryItem) {
    setGallery((prev) => {
      if (prev.some((g) => g.id === item.id)) return prev.filter((g) => g.id !== item.id);
      return [...prev, item];
    });
  }

  function handleFakeUpload(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setGallery((prev) => [
      ...prev,
      { id: newId("img"), url, name: file.name },
    ]);
  }

  function onRegisterBasic() {
    setError(null);
    setNotice(null);
    if (productId) {
      const result = updateProductBasic(productId, {
        title,
        gallery,
        categoryId: categoryId || null,
      });
      if (!result.ok) {
        setError(t(`errors.${result.error}`));
        return;
      }
      setNotice(t("notices.basicSaved"));
      return;
    }

    const result = createDraftProduct({
      title,
      gallery,
      categoryId: categoryId || null,
    });
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    setProductId(result.id);
    setNotice(t("notices.registered"));
    setTab("variants");
  }

  function setAxisCount(count: 0 | 1 | 2) {
    if (count === 0) {
      setOptions([]);
      setVariants([]);
      return;
    }
    setOptions((prev) => {
      const next = [...prev];
      while (next.length < count) {
        next.push({
          key: newId("opt"),
          name: OPTION_NAME_SUGGESTIONS[next.length] ?? "",
          values: [""],
        });
      }
      return next.slice(0, count);
    });
  }

  function rebuildMatrix(nextOptions: MockVariantOption[]) {
    const generated = regenerateVariantMatrix(
      nextOptions.map((o) => ({
        ...o,
        values: o.values.map((v) => v.trim()).filter(Boolean),
      })),
    );
    setVariants((prev) =>
      generated.map((row) => {
        const existing = prev.find(
          (p) => p.labels.join("|") === row.labels.join("|"),
        );
        return existing
          ? { ...row, key: existing.key, enabled: existing.enabled, uplift: existing.uplift }
          : row;
      }),
    );
  }

  function onSaveVariants() {
    setError(null);
    if (!productId) return;
    const cleaned = options.map((o) => ({
      ...o,
      name: o.name.trim(),
      values: o.values.map((v) => v.trim()).filter(Boolean),
    }));
    const matrix =
      cleaned.length === 0
        ? []
        : variants.length > 0
          ? variants
          : regenerateVariantMatrix(cleaned);
    const result = updateProductVariants(productId, cleaned, matrix);
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    setOptions(cleaned);
    setVariants(matrix);
    setNotice(t("notices.variantsSaved"));
  }

  function onSavePricing() {
    setError(null);
    if (!productId) return;
    const price = Number(basePrice);
    const result = updateProductPricing(
      productId,
      price,
      variants.map((v) => ({
        key: v.key,
        uplift: Number(upliftEdits[v.key] ?? v.uplift) || 0,
      })),
    );
    if (!result.ok) {
      setError(t(`errors.${result.error}`));
      return;
    }
    setNotice(t("notices.pricingSaved"));
  }

  return (
    <AdminPageShell title={t("title")} description={t("subtitle")}>
      <Alert variant="info">{t("mockBanner")}</Alert>

      <div className="mt-mol flex flex-wrap items-end gap-mol">
        <div className="min-w-[220px] flex-1">
          <Select
            label={t("fields.selectProduct")}
            value={productId ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setProductId(value || null);
              setTab("basic");
              setError(null);
              setNotice(null);
            }}
            options={[
              { value: "", label: t("fields.newProduct") },
              ...products.map((p) => ({
                value: p.id,
                label: `${p.title} (${t("status.draft")})`,
              })),
            ]}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setProductId(null);
            setTab("basic");
            setTitle("");
            setCategoryId("");
            setGallery([]);
            setOptions([]);
            setVariants([]);
            setBasePrice("");
            setError(null);
            setNotice(null);
          }}
        >
          <Plus className="size-4" />
          {t("actions.new")}
        </Button>
      </div>

      {error ? (
        <Alert variant="danger" className="mt-mol">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert variant="success" className="mt-mol">
          {notice}
        </Alert>
      ) : null}

      <Tabs className="mt-mol" variant="pills" items={tabItems} active={tab} onChange={setTab} />

      {tab === "basic" ? (
        <div className="mt-mol grid gap-mol">
          <Input
            label={t("fields.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Select
            label={t("fields.category")}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={[
              { value: "", label: t("fields.categoryOptional") },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <div>
            <h4 className="text-sm font-semibold">{t("fields.gallery")}</h4>
            <p className="mt-atom text-xs text-muted">{t("fields.galleryHint")}</p>
            <div className="mt-mol flex flex-wrap gap-pad-atom">
              {galleryPool.map((item) => {
                const selected = gallery.some((g) => g.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePoolImage(item)}
                    className={`rounded-xl border p-atom ${selected ? "border-primary ring-2 ring-primary/30" : "border-white/40"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="size-20 rounded-lg object-cover" />
                  </button>
                );
              })}
            </div>
            <div className="mt-mol">
              <Input
                type="file"
                accept="image/*"
                label={t("fields.upload")}
                onChange={(e) => handleFakeUpload(e.target.files?.[0] ?? null)}
              />
            </div>
            {gallery.length > 0 ? (
              <div className="mt-mol flex flex-wrap gap-pad-atom">
                {gallery.map((item, index) => (
                  <div key={item.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="size-24 rounded-lg object-cover" />
                    {index === 0 ? (
                      <Badge className="absolute start-1 top-1" variant="primary">
                        {t("fields.featured")}
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      className="absolute end-1 top-1 rounded bg-black/50 p-atom text-white"
                      onClick={() => setGallery((prev) => prev.filter((g) => g.id !== item.id))}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Button
            onClick={onRegisterBasic}
            disabled={!title.trim() || gallery.length === 0}
          >
            {productId ? t("actions.saveBasic") : t("actions.register")}
          </Button>
        </div>
      ) : null}

      {tab === "variants" && productId ? (
        <div className="mt-mol grid gap-mol">
          <div className="flex flex-wrap gap-pad-atom">
            <Button size="sm" variant={options.length === 0 ? "primary" : "outline"} onClick={() => setAxisCount(0)}>
              {t("variants.none")}
            </Button>
            <Button size="sm" variant={options.length === 1 ? "primary" : "outline"} onClick={() => setAxisCount(1)}>
              {t("variants.one")}
            </Button>
            <Button size="sm" variant={options.length === 2 ? "primary" : "outline"} onClick={() => setAxisCount(2)}>
              {t("variants.two")}
            </Button>
          </div>

          {options.length === 0 ? (
            <Alert variant="info">{t("variants.noneHint")}</Alert>
          ) : (
            <div className={`grid gap-mol ${options.length === 2 ? "md:grid-cols-2" : ""}`}>
              {options.map((option, optionIndex) => (
                <Card key={option.key} className="p-pad-mol">
                  <Input
                    label={t("variants.optionName")}
                    value={option.name}
                    onChange={(e) => {
                      const next = options.map((o) =>
                        o.key === option.key ? { ...o, name: e.target.value } : o,
                      );
                      setOptions(next);
                    }}
                  />
                  <div className="mt-atom-md flex flex-wrap gap-pad-atom">
                    {OPTION_NAME_SUGGESTIONS.map((name) => (
                      <Button
                        key={name}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setOptions((prev) =>
                            prev.map((o) => (o.key === option.key ? { ...o, name } : o)),
                          );
                        }}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                  <Input
                    className="mt-mol"
                    label={t("variants.values")}
                    hint={t("variants.valuesHint")}
                    value={option.values.join(", ")}
                    onChange={(e) => {
                      const parts = e.target.value.split(",").map((p) => p.trim());
                      const next = options.map((o) =>
                        o.key === option.key ? { ...o, values: parts.length ? parts : [""] } : o,
                      );
                      setOptions(next);
                      rebuildMatrix(next);
                    }}
                  />
                  <p className="mt-atom text-xs text-muted">
                    {t("variants.axisLabel", { n: optionIndex + 1 })}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {variants.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/25">
              <Table>
                <TableHead>
                  <Tr>
                    <Th>{t("variants.combination")}</Th>
                    <Th>{t("variants.enabled")}</Th>
                  </Tr>
                </TableHead>
                <TableBody>
                  {variants.map((row) => (
                    <Tr key={row.key}>
                      <Td>{row.labels.join(" / ")}</Td>
                      <Td>
                        <Toggle
                          checked={row.enabled}
                          onChange={(checked) =>
                            setVariants((prev) =>
                              prev.map((v) => (v.key === row.key ? { ...v, enabled: checked } : v)),
                            )
                          }
                          label={row.enabled ? t("variants.on") : t("variants.off")}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : options.length > 0 ? (
            <EmptyState title={t("variants.emptyMatrix")} description={t("variants.emptyMatrixHint")} />
          ) : null}

          <Button onClick={onSaveVariants}>{t("actions.saveVariants")}</Button>
        </div>
      ) : null}

      {tab === "pricing" && productId ? (
        <div className="mt-mol grid gap-mol">
          <Input
            label={t("pricing.basePrice")}
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
          />

          <div>
            <h4 className="text-sm font-semibold">{t("pricing.history")}</h4>
            {product?.priceHistory.length ? (
              <div className="mt-mol overflow-x-auto rounded-2xl border border-white/40 bg-white/25">
                <Table>
                  <TableHead>
                    <Tr>
                      <Th>{t("pricing.at")}</Th>
                      <Th>{t("pricing.old")}</Th>
                      <Th>{t("pricing.new")}</Th>
                      <Th>{t("pricing.note")}</Th>
                    </Tr>
                  </TableHead>
                  <TableBody>
                    {[...(product.priceHistory ?? [])].reverse().map((row) => (
                      <Tr key={row.id}>
                        <Td className="text-xs">{new Date(row.at).toLocaleString("fa-IR")}</Td>
                        <Td>{formatPrice(row.oldPrice)}</Td>
                        <Td>{formatPrice(row.newPrice)}</Td>
                        <Td>{row.note}</Td>
                      </Tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="mt-atom text-sm text-muted">{t("pricing.noHistory")}</p>
            )}
          </div>

          <div className="grid gap-mol">
            <h4 className="text-sm font-semibold">{t("pricing.groups")}</h4>
            {priceGroups.length === 0 ? (
              <Alert variant="info">{t("pricing.noVariants")}</Alert>
            ) : (
              priceGroups.map(([price, rows]) => {
                const uplift = price - (Number(basePrice) || 0);
                return (
                  <Card key={price} className="p-pad-mol">
                    <div className="flex flex-wrap items-center justify-between gap-pad-atom">
                      <p className="font-semibold">
                        {formatPrice(price)}{" "}
                        <span className="text-xs font-normal text-muted">
                          {uplift > 0
                            ? t("pricing.basePlus", { uplift: formatPrice(uplift) })
                            : t("pricing.sameAsBase")}
                        </span>
                      </p>
                    </div>
                    <ul className="mt-mol grid gap-atom-md">
                      {rows.map((row) => (
                        <li
                          key={row.key}
                          className="flex flex-wrap items-center justify-between gap-pad-atom rounded-lg bg-white/20 px-pad-mol py-pad-atom"
                        >
                          <span>{row.labels.join(" / ")}</span>
                          <Input
                            className="max-w-[160px]"
                            label={t("pricing.uplift")}
                            type="number"
                            value={upliftEdits[row.key] ?? "0"}
                            onChange={(e) =>
                              setUpliftEdits((prev) => ({ ...prev, [row.key]: e.target.value }))
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })
            )}
          </div>

          <Button onClick={onSavePricing}>{t("actions.savePricing")}</Button>
        </div>
      ) : null}

      {tab === "more" && productId ? (
        <Alert variant="info" className="mt-mol">
          {t("more.stub")}
        </Alert>
      ) : null}
    </AdminPageShell>
  );
}
