"use client";

import { Checkbox, Input } from "@/components/atoms";
import type { CategoryPageSettings } from "@/types/domain";

export function CategoryBannerFields({
  value,
  onChange,
}: {
  value: CategoryPageSettings;
  onChange: (value: CategoryPageSettings) => void;
}) {
  function patch(partial: Partial<CategoryPageSettings>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="grid gap-mol rounded-2xl border border-white/45 bg-white/30 p-pad-mol">
      <div>
        <p className="text-sm font-semibold text-foreground">بنر صفحه collection</p>
        <p className="mt-atom-md text-xs text-muted">
          عنوان و زیرعنوان بالای صفحه فروشگاه. تصاویر بنر از گالری (تب عمومی) خوانده می‌شوند.
        </p>
      </div>

      <Checkbox
        label="نمایش بنر در ابتدای صفحه"
        checked={value.bannerEnabled !== false}
        onChange={(event) => patch({ bannerEnabled: event.target.checked })}
      />

      <Input
        label="عنوان نمایشی"
        hint="خالی = نام فارسی دسته"
        value={value.bannerTitle ?? ""}
        onChange={(event) => patch({ bannerTitle: event.target.value || undefined })}
      />

      <Input
        label="زیرعنوان / توضیح کوتاه"
        value={value.bannerSubtitle ?? ""}
        onChange={(event) => patch({ bannerSubtitle: event.target.value || undefined })}
      />

      <Checkbox
        label="نمایش تعداد محصول"
        checked={value.showProductCount !== false}
        onChange={(event) => patch({ showProductCount: event.target.checked })}
      />
    </div>
  );
}
