"use client";

import { useTranslations } from "next-intl";
import { Badge, Checkbox, Select } from "@/components/atoms";
import type { CategoryDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface CategoryMultiSelectProps {
  categories: CategoryDto[];
  selectedIds: string[];
  primaryCategoryId: string;
  onChange: (selectedIds: string[], primaryCategoryId: string) => void;
  className?: string;
}

export function CategoryMultiSelect({
  categories,
  selectedIds,
  primaryCategoryId,
  onChange,
  className,
}: CategoryMultiSelectProps) {
  const t = useTranslations("admin.products.categorySelect");

  function toggleCategory(categoryId: string, checked: boolean) {
    if (checked) {
      const nextIds = [...selectedIds, categoryId];
      onChange(nextIds, primaryCategoryId || categoryId);
      return;
    }

    const nextIds = selectedIds.filter((id) => id !== categoryId);
    const nextPrimary =
      primaryCategoryId === categoryId ? (nextIds[0] ?? "") : primaryCategoryId;
    onChange(nextIds, nextPrimary);
  }

  function setPrimary(categoryId: string) {
    if (!selectedIds.includes(categoryId)) {
      onChange([...selectedIds, categoryId], categoryId);
      return;
    }
    onChange(selectedIds, categoryId);
  }

  const realCategories = categories.filter((c) => c.kind !== "virtual");

  const primaryOptions = selectedIds.map((id) => {
    const category = realCategories.find((item) => item.id === id);
    return { value: id, label: category?.name ?? id };
  });

  return (
    <div className={cn("grid gap-mol", className)}>
      <div className="rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
        <div className="flex items-center justify-between gap-pad-atom">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("title")}</h4>
            <p className="mt-atom-md text-xs text-muted">{t("hint")}</p>
          </div>
          <Badge variant="neutral">{t("selectedCount", { count: selectedIds.length })}</Badge>
        </div>

        <div className="mt-mol max-h-56 space-y-pad-atom overflow-y-auto pe-pad-atom">
          {realCategories.map((category) => (
            <Checkbox
              key={category.id}
              label={category.nameFa || category.name}
              checked={selectedIds.includes(category.id)}
              onChange={(event) => toggleCategory(category.id, event.target.checked)}
            />
          ))}
        </div>
      </div>

      <Select
        label={t("primaryLabel")}
        hint={t("primaryHint")}
        value={primaryCategoryId}
        onChange={(event) => setPrimary(event.target.value)}
        options={[
          { value: "", label: t("noPrimary") },
          ...primaryOptions,
        ]}
        disabled={!selectedIds.length}
      />
    </div>
  );
}
