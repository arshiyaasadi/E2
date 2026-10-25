"use client";

import { useMemo } from "react";
import { Checkbox, Input, Select } from "@/components/atoms";
import type { CategoryDto, ShopPageFilters } from "@/types/domain";

const AUDIENCE_OPTIONS = [
  { value: "women", label: "زنانه" },
  { value: "men", label: "مردانه" },
  { value: "kids", label: "بچه‌گانه" },
];

const SORT_OPTIONS = [
  { value: "", label: "پیش‌فرض" },
  { value: "newest", label: "جدیدترین" },
  { value: "popular", label: "پرفروش" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
  { value: "discount", label: "بیشترین تخفیف" },
];

function MultiCheck({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
      <p className="mb-pad-atom text-sm font-medium text-foreground">{label}</p>
      <div className="max-h-40 space-y-pad-atom overflow-y-auto">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={selected.includes(option.value)}
            onChange={(event) => {
              if (event.target.checked) onChange([...selected, option.value]);
              else onChange(selected.filter((v) => v !== option.value));
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CategoryFiltersFields({
  value,
  onChange,
  categories,
  brands = [],
  tags = [],
}: {
  value: ShopPageFilters;
  onChange: (value: ShopPageFilters) => void;
  categories: CategoryDto[];
  brands?: Array<{ slug: string; name: string; nameFa?: string }>;
  tags?: Array<{ slug: string; name: string; nameFa?: string }>;
}) {
  const realCategories = useMemo(
    () => categories.filter((c) => c.kind === "real"),
    [categories],
  );

  function patch(partial: Partial<ShopPageFilters>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="grid gap-mol">
      <Input
        label="جستجو (q)"
        value={value.q ?? ""}
        onChange={(event) => patch({ q: event.target.value || undefined })}
      />

      <MultiCheck
        label="مخاطب (audience)"
        options={AUDIENCE_OPTIONS}
        selected={value.audience ?? []}
        onChange={(audience) =>
          patch({ audience: audience as ShopPageFilters["audience"] })
        }
      />

      <MultiCheck
        label="دسته واقعی (category)"
        options={realCategories.map((c) => ({
          value: c.slug,
          label: c.nameFa || c.name,
        }))}
        selected={value.category ?? []}
        onChange={(category) => patch({ category })}
      />

      {brands.length ? (
        <MultiCheck
          label="برند"
          options={brands.map((b) => ({ value: b.slug, label: b.nameFa || b.name }))}
          selected={value.brand ?? []}
          onChange={(brand) => patch({ brand })}
        />
      ) : null}

      {tags.length ? (
        <MultiCheck
          label="تگ"
          options={tags.map((t) => ({ value: t.slug, label: t.nameFa || t.name }))}
          selected={value.tag ?? []}
          onChange={(tag) => patch({ tag })}
        />
      ) : null}

      <div className="grid gap-mol sm:grid-cols-2">
        <Input
          label="حداقل قیمت"
          type="number"
          value={value.minPrice ?? ""}
          onChange={(event) =>
            patch({
              minPrice: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          textDirection="ltr"
        />
        <Input
          label="حداکثر قیمت"
          type="number"
          value={value.maxPrice ?? ""}
          onChange={(event) =>
            patch({
              maxPrice: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          textDirection="ltr"
        />
      </div>

      <div className="flex flex-wrap gap-mol">
        <Checkbox
          label="حراج"
          checked={Boolean(value.sale)}
          onChange={(event) => patch({ sale: event.target.checked || undefined })}
        />
        <Checkbox
          label="موجود"
          checked={Boolean(value.inStock)}
          onChange={(event) => patch({ inStock: event.target.checked || undefined })}
        />
        <Checkbox
          label="ویژه (featured)"
          checked={Boolean(value.featured)}
          onChange={(event) => patch({ featured: event.target.checked || undefined })}
        />
      </div>

      <Select
        label="مرتب‌سازی"
        value={value.sort ?? ""}
        onChange={(event) =>
          patch({
            sort: (event.target.value || undefined) as ShopPageFilters["sort"],
          })
        }
        options={SORT_OPTIONS}
      />
    </div>
  );
}
