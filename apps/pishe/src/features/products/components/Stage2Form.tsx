"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { BottomActionButton } from "@/components/molecules/BottomActionButton";
import { AppTemplate } from "@/components/templates/AppTemplate";
import {
  formatTomanFromRial,
  parseRialInput,
} from "@/features/products/money";
import {
  usePatchProductMutation,
  useProductQuery,
} from "@/features/products/queries";
import {
  type ProductUnit,
  type VariantAttributeKind,
  type VariantRow,
} from "@/features/products/types";
import { BottomActions } from "@/providers/BottomActionsProvider";
import { ROUTES } from "@/config/routes";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

function newId() {
  return crypto.randomUUID();
}

function buildRows(
  values1: string[],
  values2: string[],
  basePrice: number,
  previous: VariantRow[],
): VariantRow[] {
  if (values1.length === 0) return [];
  const combos: { a1: string; a2?: string }[] = [];
  if (values2.length === 0) {
    for (const a1 of values1) combos.push({ a1 });
  } else {
    for (const a1 of values1) {
      for (const a2 of values2) combos.push({ a1, a2 });
    }
  }
  return combos.map(({ a1, a2 }) => {
    const existing = previous.find(
      (r) => r.attr1Value === a1 && (r.attr2Value ?? "") === (a2 ?? ""),
    );
    return {
      id: existing?.id ?? newId(),
      attr1Value: a1,
      attr2Value: a2,
      priceRial: existing?.priceRial ?? basePrice,
      active: existing?.active ?? true,
    };
  });
}

export function Stage2Form({
  productId,
  embedded = false,
  hidePrice = false,
  onSaved,
}: {
  productId: string;
  embedded?: boolean;
  /** When true, use product base price and skip the price field UI. */
  hidePrice?: boolean;
  onSaved?: () => void;
}) {
  const t = useTranslations("products.stage2");
  const tErr = useTranslations("products.errors");
  const tDetail = useTranslations("products.detail");
  const router = useRouter();
  const query = useProductQuery(productId);
  const patch = usePatchProductMutation(productId);

  const product = query.data;
  const [priceRaw, setPriceRaw] = useState("");
  const [attr1Kind, setAttr1Kind] = useState<VariantAttributeKind>("none");
  const [attr2Kind, setAttr2Kind] = useState<VariantAttributeKind>("none");
  const [values1, setValues1] = useState<string[]>([]);
  const [values2, setValues2] = useState<string[]>([]);
  const [draft1, setDraft1] = useState("");
  const [draft2, setDraft2] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [manual, setManual] = useState(false);
  const [sheet, setSheet] = useState<null | "percent" | "amount" | "copy">(null);
  const [sheetValue, setSheetValue] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  useEffect(() => {
    if (!product || hydratedId === product.id) return;
    setPriceRaw(String(product.priceRial ?? 0));
    setAttr1Kind(product.variants?.attr1.kind ?? "none");
    setAttr2Kind(product.variants?.attr2?.kind ?? "none");
    setValues1(product.variants?.attr1.values ?? []);
    setValues2(product.variants?.attr2?.values ?? []);
    setRows(product.variants?.rows ?? []);
    setHydratedId(product.id);
  }, [product, hydratedId]);

  const basePrice = hidePrice
    ? (product?.priceRial ?? 0)
    : (parseRialInput(priceRaw) ?? 0);

  function syncRowsFromAttrs(
    next1: string[],
    next2: string[],
    kind2: VariantAttributeKind,
    previous = rows,
  ) {
    const v2 = kind2 !== "none" ? next2 : [];
    setRows(buildRows(next1, v2, basePrice, previous));
  }

  function addValue(which: 1 | 2, draft: string, setDraft: (v: string) => void) {
    const value = draft.trim();
    if (!value) return;
    const list = which === 1 ? values1 : values2;
    if (list.includes(value)) {
      setError(tErr("variantDuplicate"));
      return;
    }
    if (list.length >= 20) {
      setError(tErr("variantMaxValues"));
      return;
    }
    setError(null);
    if (which === 1) {
      const next = [...values1, value];
      setValues1(next);
      syncRowsFromAttrs(next, values2, attr2Kind);
    } else {
      const next = [...values2, value];
      setValues2(next);
      syncRowsFromAttrs(values1, next, attr2Kind);
    }
    setDraft("");
  }

  function applyEqualize() {
    setRows((prev) => prev.map((r) => ({ ...r, priceRial: basePrice })));
  }

  function applyPercent() {
    const n = Number(sheetValue.replace(/[^\d+-]/g, ""));
    if (!Number.isFinite(n)) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        priceRial: Math.max(0, Math.round(r.priceRial * (1 + n / 100))),
      })),
    );
    setSheet(null);
    setSheetValue("");
  }

  function applyAmount() {
    const cleaned = sheetValue.trim();
    const negative = cleaned.startsWith("-");
    const n = parseRialInput(cleaned.replace(/^[+-]/, "")) ?? 0;
    const signed = negative ? -n : n;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        priceRial: Math.max(0, r.priceRial + signed),
      })),
    );
    setSheet(null);
    setSheetValue("");
  }

  function applyCopy() {
    const source = rows.find((r) => r.id === copyFrom);
    if (!source) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === source.id ? r : { ...r, priceRial: source.priceRial },
      ),
    );
    setSheet(null);
    setCopyFrom("");
  }

  async function save() {
    setError(null);

    if (!hidePrice && parseRialInput(priceRaw) === null) {
      setError(tErr("priceRequired"));
      return;
    }

    if (attr1Kind !== "none" && values1.length === 0) {
      setError(tErr("attr1Values"));
      return;
    }
    if (attr2Kind !== "none" && values2.length === 0) {
      setError(tErr("attr2Values"));
      return;
    }

    const working =
      attr1Kind === "none"
        ? []
        : buildRows(
            values1,
            attr2Kind !== "none" ? values2 : [],
            basePrice,
            rows,
          );

    if (working.length > 50) {
      setError(tErr("variantMaxRows"));
      return;
    }
    if (working.length > 0 && working.every((r) => !r.active)) {
      setError(tErr("variantAllRemoved"));
      return;
    }
    if (
      working.some(
        (r) => r.active && (r.priceRial < 0 || !Number.isFinite(r.priceRial)),
      )
    ) {
      setError(tErr("variantPrice"));
      return;
    }

    try {
      await patch.mutateAsync({
        ...(hidePrice ? {} : { priceRial: basePrice }),
        unit: (product?.unit ?? "piece") as ProductUnit,
        complete: true,
        variants:
          attr1Kind === "none"
            ? { attr1: { kind: "none", values: [] }, rows: [] }
            : {
                attr1: { kind: attr1Kind, values: values1 },
                attr2:
                  attr2Kind !== "none"
                    ? { kind: attr2Kind, values: values2 }
                    : undefined,
                rows: working,
              },
      });
      if (onSaved) onSaved();
      else router.push(ROUTES.product(productId));
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  if (query.isLoading && !query.data) {
    return (
      <div
        className={cn(
          "flex items-center justify-center",
          embedded ? "min-h-40" : "min-h-dvh",
        )}
      >
        <Spinner />
      </div>
    );
  }

  if (!product) {
    if (embedded) return <Alert variant="error">—</Alert>;
    return (
      <AppTemplate title={t("title")}>
        <Alert variant="error">—</Alert>
      </AppTemplate>
    );
  }

  const displayRows =
    attr1Kind === "none"
      ? []
      : buildRows(
          values1,
          attr2Kind !== "none" ? values2 : [],
          basePrice,
          rows,
        );

  const kindChips: { kind: VariantAttributeKind; label: string }[] = [
    { kind: "color", label: t("attrColor") },
    { kind: "size", label: t("attrSize") },
    { kind: "none", label: t("attrNone") },
  ];

  const body = (
    <>
      <div className="flex flex-col gap-mol-md">
        {!hidePrice ? (
          <section className="rounded-2xl border border-border bg-surface p-pad-mol shadow-sm">
            <h3 className="mb-atom text-sm font-semibold">{t("basePrice")}</h3>
            <Input
              inputMode="numeric"
              dir="ltr"
              className="text-end"
              value={priceRaw}
              onChange={(e) => setPriceRaw(e.target.value)}
              placeholder="0"
            />
            <p className="mt-atom text-sm text-muted">
              {t("basePriceToman", { price: formatTomanFromRial(basePrice) })}
            </p>
            <p className="mt-atom text-xs text-muted">{t("basePriceHint")}</p>
          </section>
        ) : null}

        <AttrEditor
          title={t("attr1")}
          kind={attr1Kind}
          kinds={kindChips}
          values={values1}
          draft={draft1}
          onKind={(k) => {
            setAttr1Kind(k);
            if (k === "none") {
              setValues1([]);
              setAttr2Kind("none");
              setValues2([]);
              setRows([]);
            }
          }}
          onDraft={setDraft1}
          onAdd={() => addValue(1, draft1, setDraft1)}
          onRemove={(v) => {
            const next = values1.filter((x) => x !== v);
            setValues1(next);
            syncRowsFromAttrs(next, values2, attr2Kind);
          }}
          addLabel={t("addValue")}
          placeholder={t("valuePlaceholder")}
        />

        {attr1Kind !== "none" ? (
          <AttrEditor
            title={t("attr2")}
            kind={attr2Kind}
            kinds={kindChips}
            values={values2}
            draft={draft2}
            onKind={(k) => {
              setAttr2Kind(k);
              if (k === "none") {
                setValues2([]);
                syncRowsFromAttrs(values1, [], "none");
              }
            }}
            onDraft={setDraft2}
            onAdd={() => addValue(2, draft2, setDraft2)}
            onRemove={(v) => {
              const next = values2.filter((x) => x !== v);
              setValues2(next);
              syncRowsFromAttrs(values1, next, attr2Kind);
            }}
            addLabel={t("addValue")}
            placeholder={t("valuePlaceholder")}
          />
        ) : null}

        {displayRows.length > 0 ? (
          <section className="flex flex-col gap-mol">
            <div className="flex flex-wrap gap-atom-md">
              <Button type="button" size="sm" variant="outline" onClick={applyEqualize}>
                {t("equalize")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSheet("percent")}
              >
                {t("percent")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSheet("amount")}
              >
                {t("amount")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setManual((v) => !v)}
              >
                {t("manual")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSheet("copy")}
              >
                {t("copyFrom")}
              </Button>
            </div>

            <h3 className="text-sm font-semibold">{t("combinations")}</h3>
            <ul className="flex flex-col gap-atom-md">
              {displayRows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-atom-md rounded-xl border border-border bg-surface p-pad-mol"
                >
                  <Checkbox
                    checked={row.active}
                    onChange={(e) => {
                      setRows(
                        displayRows.map((r) =>
                          r.id === row.id
                            ? { ...r, active: e.target.checked }
                            : r,
                        ),
                      );
                    }}
                    aria-label={t("rowActive")}
                  />
                  <div className="flex-1 text-sm">
                    {[row.attr1Value, row.attr2Value].filter(Boolean).join(" / ")}
                  </div>
                  {manual ? (
                    <Input
                      className="w-28 text-end"
                      dir="ltr"
                      inputMode="numeric"
                      value={String(row.priceRial)}
                      onChange={(e) => {
                        const n = parseRialInput(e.target.value);
                        if (n === null) return;
                        setRows(
                          displayRows.map((r) =>
                            r.id === row.id ? { ...r, priceRial: n } : r,
                          ),
                        );
                      }}
                    />
                  ) : (
                    <span className="text-sm text-muted">
                      {formatTomanFromRial(row.priceRial)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>

      <BottomActions>
        <BottomActionButton
          icon={Save}
          label={t("save")}
          loading={patch.isPending}
          disabled={patch.isPending}
          onClick={() => void save()}
        />
      </BottomActions>

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-pad-mol">
          <div className="w-full max-w-md rounded-t-xl bg-surface p-pad-mol-md">
            {sheet === "percent" ? (
              <>
                <p className="mb-atom text-sm font-medium">{t("percentPrompt")}</p>
                <Input
                  dir="ltr"
                  value={sheetValue}
                  onChange={(e) => setSheetValue(e.target.value)}
                  placeholder="+10"
                />
                <Button className="mt-mol" fullWidth onClick={applyPercent}>
                  {t("apply")}
                </Button>
              </>
            ) : null}
            {sheet === "amount" ? (
              <>
                <p className="mb-atom text-sm font-medium">{t("amountPrompt")}</p>
                <Input
                  dir="ltr"
                  value={sheetValue}
                  onChange={(e) => setSheetValue(e.target.value)}
                  placeholder="+10000"
                />
                <Button className="mt-mol" fullWidth onClick={applyAmount}>
                  {t("apply")}
                </Button>
              </>
            ) : null}
            {sheet === "copy" ? (
              <>
                <p className="mb-atom text-sm font-medium">{t("copyFrom")}</p>
                <select
                  className="h-control w-full rounded-md border border-border bg-surface px-pad-mol"
                  value={copyFrom}
                  onChange={(e) => setCopyFrom(e.target.value)}
                >
                  <option value="">—</option>
                  {displayRows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {[r.attr1Value, r.attr2Value].filter(Boolean).join(" / ")}
                    </option>
                  ))}
                </select>
                <Button className="mt-mol" fullWidth onClick={applyCopy}>
                  {t("apply")}
                </Button>
              </>
            ) : null}
            <Button
              className="mt-atom-md"
              variant="ghost"
              fullWidth
              onClick={() => setSheet(null)}
            >
              {tDetail("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded) return body;

  return (
    <AppTemplate title={t("title")}>
      <div className="mb-mol-md flex animate-fade-rise justify-center">
        <span className="inline-flex items-center gap-atom-md rounded-full border border-primary/25 bg-primary/10 px-pad-mol py-pad-atom text-sm font-semibold text-primary shadow-sm">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-white">
            2
          </span>
          {t("title")}
        </span>
      </div>
      <div className="mb-mol">
        <p className="font-semibold text-foreground">{product.title}</p>
      </div>
      {body}
    </AppTemplate>
  );
}

function AttrEditor({
  title,
  kind,
  kinds,
  values,
  draft,
  onKind,
  onDraft,
  onAdd,
  onRemove,
  addLabel,
  placeholder,
}: {
  title: string;
  kind: VariantAttributeKind;
  kinds: { kind: VariantAttributeKind; label: string }[];
  values: string[];
  draft: string;
  onKind: (k: VariantAttributeKind) => void;
  onDraft: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
  addLabel: string;
  placeholder: string;
}) {
  return (
    <section className="flex flex-col gap-atom-md">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-atom-md">
        {kinds.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => onKind(k.kind)}
            className={cn(
              "rounded-full px-pad-mol py-pad-atom text-sm",
              kind === k.kind ? "bg-primary text-white" : "bg-surface-2 text-muted",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>
      {kind !== "none" ? (
        <>
          <div className="flex gap-atom-md">
            <Input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={onAdd}>
              {addLabel}
            </Button>
          </div>
          <div className="flex flex-wrap gap-atom">
            {values.map((v) => (
              <button
                key={v}
                type="button"
                className="rounded-full bg-surface-2 px-pad-atom-md py-0.5 text-sm"
                onClick={() => onRemove(v)}
              >
                {v} ×
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
