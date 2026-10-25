"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { Alert, Button, Input, Spinner } from "@/components/atoms";
import { useProducts } from "@/features/products/queries";

export type PinnedProductDraft = {
  productId: string;
  title: string;
  slug: string;
  status?: string;
};

export function CategoryPinnedProductsField({
  value,
  onChange,
}: {
  value: PinnedProductDraft[];
  onChange: (value: PinnedProductDraft[]) => void;
}) {
  const [q, setQ] = useState("");
  const { data, isFetching } = useProducts({
    q: q.trim() || undefined,
    status: "active",
  });
  const suggestions = useMemo(() => {
    const selected = new Set(value.map((v) => v.productId));
    return (data ?? [])
      .filter((p) => !selected.has(p.id) && p.status === "active")
      .slice(0, 8)
      .map((p) => ({
        productId: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
      }));
  }, [data, value]);

  const inactivePins = value.filter((v) => v.status && v.status !== "active");

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-mol">
      <p className="text-sm font-medium text-foreground">محصولات دستی (اول نمایش)</p>
      <p className="text-xs text-muted">
        فقط محصولات منتشرشده (فعال) در فروشگاه نمایش داده می‌شوند و در ابتدای لیست می‌آیند.
      </p>
      {inactivePins.length ? (
        <Alert variant="warning">
          {inactivePins.length} محصول پین شده فعال نیست و در صفحه collection دیده نمی‌شود. وضعیت
          محصول را به «فعال» تغییر دهید یا آن را حذف کنید.
        </Alert>
      ) : null}
      <Input
        placeholder="جستجوی محصول فعال برای افزودن…"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      {isFetching ? <Spinner size="sm" /> : null}
      {q.trim() && suggestions.length ? (
        <ul className="max-h-40 space-y-pad-atom overflow-y-auto rounded-xl border border-white/50 bg-white/40 p-pad-atom">
          {suggestions.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-pad-atom">
              <span className="truncate text-sm">{item.title}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                startIcon={<Plus className="size-3.5" />}
                onClick={() => onChange([...value, item])}
              >
                افزودن
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {q.trim() && !isFetching && !suggestions.length ? (
        <p className="text-xs text-muted">محصول فعالی پیدا نشد</p>
      ) : null}

      {value.length ? (
        <ul className="space-y-pad-atom">
          {value.map((item, index) => (
            <li
              key={item.productId}
              className="flex items-center gap-pad-atom rounded-xl border border-white/50 bg-white/35 px-pad-mol py-pad-atom"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {item.title}
                {item.status && item.status !== "active" ? (
                  <span className="ms-2 text-[11px] text-amber-700">({item.status})</span>
                ) : null}
              </span>
              <Button type="button" size="sm" variant="outline" disabled={index === 0} onClick={() => move(index, -1)}>
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange(value.filter((v) => v.productId !== item.productId))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">هنوز محصول دستی اضافه نشده</p>
      )}

      {q ? (
        <Button type="button" size="sm" variant="ghost" startIcon={<X className="size-4" />} onClick={() => setQ("")}>
          پاک کردن جستجو
        </Button>
      ) : null}
    </div>
  );
}
