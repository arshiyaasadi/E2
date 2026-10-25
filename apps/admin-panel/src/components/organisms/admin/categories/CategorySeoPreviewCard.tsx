"use client";

import type { CategoryDto } from "@/types/domain";

export function CategorySeoPreviewCard({ category }: { category: CategoryDto }) {
  const title = category.seoTitle || category.name;
  const description = category.seoDescription || category.description || "";
  const ogTitle = category.ogTitle || title;
  const ogDescription = category.ogDescription || description;
  const ogImage = category.ogImage?.url || category.image?.url;
  const url = category.canonicalUrl || `/categories/${category.slug}`;

  return (
    <div className="grid gap-mol lg:grid-cols-2">
      <div className="rounded-2xl border border-white/50 bg-white/45 p-pad-mol">
        <p className="mb-pad-atom text-xs font-medium text-muted">پیش‌نمایش Google</p>
        <p className="truncate text-sm text-[#1a0dab]">{title}</p>
        <p className="truncate font-mono text-xs text-[#006621]">{url}</p>
        <p className="mt-atom-md line-clamp-2 text-xs text-[#545454]">{description || "—"}</p>
        <p className="mt-pad-atom font-mono text-[10px] text-muted">robots: {category.metaRobots}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/45">
        <p className="border-b border-white/45 px-pad-mol py-pad-atom text-xs font-medium text-muted">
          پیش‌نمایش Open Graph
        </p>
        {ogImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ogImage} alt={ogTitle} className="aspect-[1.91/1] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1.91/1] items-center justify-center bg-white/35 text-xs text-muted">
            بدون تصویر OG
          </div>
        )}
        <div className="p-pad-mol">
          <p className="truncate text-sm font-semibold">{ogTitle}</p>
          <p className="mt-atom-md line-clamp-2 text-xs text-muted">{ogDescription || "—"}</p>
        </div>
      </div>
    </div>
  );
}
