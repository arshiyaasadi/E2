"use client";

import { useTranslations } from "next-intl";
import { Badge, Checkbox } from "@/components/atoms";
import type { TagDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface TagMultiSelectProps {
  tags: TagDto[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export function TagMultiSelect({ tags, selectedIds, onChange, className }: TagMultiSelectProps) {
  const t = useTranslations("admin.products.tagSelect");

  function toggleTag(tagId: string, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, tagId]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== tagId));
  }

  return (
    <div className={cn("rounded-2xl border border-white/45 bg-white/30 p-pad-mol", className)}>
      <div className="flex items-center justify-between gap-pad-atom">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t("title")}</h4>
          <p className="mt-atom-md text-xs text-muted">{t("hint")}</p>
        </div>
        <Badge variant="neutral">{t("selectedCount", { count: selectedIds.length })}</Badge>
      </div>

      <div className="mt-mol max-h-48 space-y-pad-atom overflow-y-auto pe-pad-atom">
        {tags.length === 0 ? (
          <p className="text-xs text-muted">{t("empty")}</p>
        ) : (
          tags.map((tag) => (
            <Checkbox
              key={tag.id}
              label={tag.nameFa || tag.name}
              checked={selectedIds.includes(tag.id)}
              onChange={(event) => toggleTag(tag.id, event.target.checked)}
            />
          ))
        )}
      </div>
    </div>
  );
}
