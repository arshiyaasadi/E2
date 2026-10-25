"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Alert, Badge, Button, Input } from "@/components/atoms";
import { Table, TableBody, TableHead, Td, Th, Tr } from "@/components/atoms/Table";
import type { ProductDetailDto, ProductVariantsInput } from "@/types/domain";

function newKey() {
  return `k_${Math.random().toString(36).slice(2, 10)}`;
}

export type VariantOptionValueForm = {
  key: string;
  id?: string;
  value: string;
  position: number;
};

export type VariantOptionForm = {
  key: string;
  id?: string;
  name: string;
  position: number;
  values: VariantOptionValueForm[];
};

export type ProductVariantFormRow = {
  key: string;
  id?: string;
  sku: string;
  price: string;
  comparePrice: string;
  isDefault: boolean;
  optionValueKeys: string[];
};

export function emptyVariantState() {
  return { options: [] as VariantOptionForm[], variants: [] as ProductVariantFormRow[] };
}

export function mapDetailToVariantForm(detail: ProductDetailDto) {
  const optionKeyById = new Map<string, string>();
  const valueKeyById = new Map<string, string>();

  const options: VariantOptionForm[] = detail.options.map((option) => {
    const optionKey = newKey();
    optionKeyById.set(option.id, optionKey);
    return {
      key: optionKey,
      id: option.id,
      name: option.name,
      position: option.position,
      values: option.values.map((value) => {
        const valueKey = newKey();
        valueKeyById.set(value.id, valueKey);
        return {
          key: valueKey,
          id: value.id,
          value: value.value,
          position: value.position,
        };
      }),
    };
  });

  const variants: ProductVariantFormRow[] = detail.variants.map((variant) => ({
    key: newKey(),
    id: variant.id,
    sku: variant.sku,
    price: variant.price !== null ? String(variant.price) : "",
    comparePrice: variant.comparePrice !== null ? String(variant.comparePrice) : "",
    isDefault: variant.isDefault,
    optionValueKeys: variant.optionValues.map((item) => valueKeyById.get(item.id) ?? item.id),
  }));

  return { options, variants };
}

export function mapVariantFormToPayload(
  options: VariantOptionForm[],
  variants: ProductVariantFormRow[],
): ProductVariantsInput {
  return {
    options: options.map((option, optionIndex) => ({
      id: option.id,
      name: option.name.trim(),
      position: optionIndex,
      values: option.values.map((value, valueIndex) => ({
        id: value.id,
        key: value.key,
        value: value.value.trim(),
        position: valueIndex,
      })),
    })),
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku.trim(),
      price: variant.price.trim() ? Number(variant.price) : null,
      comparePrice: variant.comparePrice.trim() ? Number(variant.comparePrice) : null,
      isDefault: variant.isDefault,
      optionValueKeys: variant.optionValueKeys,
    })),
  };
}

function cartesianVariants(options: VariantOptionForm[]): ProductVariantFormRow[] {
  if (options.length === 0 || options.some((option) => option.values.length === 0)) {
    return [];
  }

  type ComboItem = { valueKey: string; label: string };
  let combos: ComboItem[][] = [[]];

  for (const option of options) {
    combos = combos.flatMap((combo) =>
      option.values.map((value) => [...combo, { valueKey: value.key, label: value.value }]),
    );
  }

  return combos.map((combo, index) => ({
    key: newKey(),
    sku: combo.map((item) => item.label.replace(/\s+/g, "-").toUpperCase()).join("-"),
    price: "",
    comparePrice: "",
    isDefault: index === 0,
    optionValueKeys: combo.map((item) => item.valueKey),
  }));
}

export interface ProductVariantsEditorProps {
  options: VariantOptionForm[];
  variants: ProductVariantFormRow[];
  onChange: (next: { options: VariantOptionForm[]; variants: ProductVariantFormRow[] }) => void;
}

export function ProductVariantsEditor({ options, variants, onChange }: ProductVariantsEditorProps) {
  const t = useTranslations("admin.products.variants");

  function updateOptions(nextOptions: VariantOptionForm[]) {
    onChange({ options: nextOptions, variants });
  }

  function updateVariants(nextVariants: ProductVariantFormRow[]) {
    onChange({ options, variants: nextVariants });
  }

  function addOption() {
    updateOptions([
      ...options,
      {
        key: newKey(),
        name: "",
        position: options.length,
        values: [{ key: newKey(), value: "", position: 0 }],
      },
    ]);
  }

  function removeOption(optionKey: string) {
    const nextOptions = options.filter((item) => item.key !== optionKey);
    const removedValueKeys = new Set(
      options.find((item) => item.key === optionKey)?.values.map((value) => value.key) ?? [],
    );
    updateOptions(nextOptions.map((item, index) => ({ ...item, position: index })));
    updateVariants(
      variants
        .filter((variant) => !variant.optionValueKeys.some((key) => removedValueKeys.has(key)))
        .map((variant, index) => ({ ...variant, isDefault: index === 0 })),
    );
  }

  function updateOptionName(optionKey: string, name: string) {
    updateOptions(options.map((item) => (item.key === optionKey ? { ...item, name } : item)));
  }

  function updateOptionValues(optionKey: string, rawValues: string) {
    const parts = rawValues
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    updateOptions(
      options.map((item) => {
        if (item.key !== optionKey) return item;
        const nextValues = parts.map((value, index) => {
          const existing = item.values[index];
          return existing
            ? { ...existing, value, position: index }
            : { key: newKey(), value, position: index };
        });
        return { ...item, values: nextValues.length > 0 ? nextValues : [{ key: newKey(), value: "", position: 0 }] };
      }),
    );
  }

  function generateVariants() {
    const generated = cartesianVariants(options);
    updateVariants(generated);
  }

  function updateVariantRow(variantKey: string, patch: Partial<ProductVariantFormRow>) {
    updateVariants(variants.map((item) => (item.key === variantKey ? { ...item, ...patch } : item)));
  }

  function removeVariant(variantKey: string) {
    const next = variants.filter((item) => item.key !== variantKey);
    updateVariants(next.map((item, index) => ({ ...item, isDefault: index === 0 ? true : item.isDefault && index === 0 })));
  }

  function setDefaultVariant(variantKey: string) {
    updateVariants(variants.map((item) => ({ ...item, isDefault: item.key === variantKey })));
  }

  return (
    <div className="grid gap-mol">
      <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
        <div className="flex flex-wrap items-center justify-between gap-pad-atom">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("optionsTitle")}</h4>
            <p className="mt-atom-md text-xs text-muted">{t("optionsHint")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={addOption}>
            <Plus className="size-4" />
            {t("addOption")}
          </Button>
        </div>

        <div className="mt-mol grid gap-mol">
          {options.length === 0 ? (
            <Alert variant="info">{t("noOptions")}</Alert>
          ) : (
            options.map((option) => (
              <div key={option.key} className="rounded-xl border border-white/40 bg-white/20 p-pad-mol">
                <div className="grid gap-mol sm:grid-cols-[1fr_1.5fr_auto]">
                  <Input
                    label={t("optionName")}
                    value={option.name}
                    onChange={(event) => updateOptionName(option.key, event.target.value)}
                  />
                  <Input
                    label={t("optionValues")}
                    hint={t("optionValuesHint")}
                    value={option.values.map((value) => value.value).join(", ")}
                    onChange={(event) => updateOptionValues(option.key, event.target.value)}
                  />
                  <div className="flex items-end">
                    <Button size="sm" variant="danger" onClick={() => removeOption(option.key)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-pad-atom">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("variantsTitle")}</h4>
          <p className="mt-atom-md text-xs text-muted">{t("variantsHint")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={generateVariants} disabled={options.length === 0}>
          <Wand2 className="size-4" />
          {t("generateVariants")}
        </Button>
      </div>

      {variants.length === 0 ? (
        <Alert variant="info">{t("noVariants")}</Alert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/45">
          <Table>
            <TableHead>
              <Tr hoverable={false}>
                <Th>{t("columns.options")}</Th>
                <Th>{t("columns.sku")}</Th>
                <Th>{t("columns.price")}</Th>
                <Th>{t("columns.comparePrice")}</Th>
                <Th>{t("columns.default")}</Th>
                <Th>{t("columns.actions")}</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {variants.map((variant) => {
                const labels = variant.optionValueKeys.map((valueKey) => {
                  for (const option of options) {
                    const value = option.values.find((item) => item.key === valueKey);
                    if (value) return `${option.name}: ${value.value}`;
                  }
                  return valueKey;
                });

                return (
                  <Tr key={variant.key}>
                    <Td>
                      <div className="flex flex-wrap gap-pad-atom">
                        {labels.map((label) => (
                          <Badge key={label} variant="neutral">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Input
                        value={variant.sku}
                        onChange={(event) => updateVariantRow(variant.key, { sku: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        min={0}
                        value={variant.price}
                        onChange={(event) => updateVariantRow(variant.key, { price: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        min={0}
                        value={variant.comparePrice}
                        onChange={(event) =>
                          updateVariantRow(variant.key, { comparePrice: event.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant={variant.isDefault ? "primary" : "outline"}
                        onClick={() => setDefaultVariant(variant.key)}
                      >
                        {variant.isDefault ? t("defaultYes") : t("setDefault")}
                      </Button>
                    </Td>
                    <Td>
                      <Button size="sm" variant="danger" onClick={() => removeVariant(variant.key)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
