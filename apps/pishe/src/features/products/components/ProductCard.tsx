"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatTomanFromRial } from "@/features/products/money";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";

export function ProductCard({
  product,
  compact = false,
}: {
  product: ProductListItem;
  compact?: boolean;
}) {
  const tStatus = useTranslations("products.status");

  return (
    <Link
      href={ROUTES.product(product.id)}
      className={cn(
        "block shrink-0 overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
        compact ? "w-36" : "w-full",
      )}
    >
      <div className="relative aspect-square bg-surface-2">
        {product.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : null}
        {product.status === "basic" ? (
          <span className="absolute inset-x-0 top-0 h-0.5 bg-warning" />
        ) : null}
        <span
          className={cn(
            "absolute end-2 top-2 size-2.5 rounded-full",
            product.status === "complete" ? "bg-success" : "bg-warning",
          )}
          title={tStatus(product.status)}
        />
        {product.photoCount > 1 ? (
          <span className="absolute bottom-2 end-2 rounded-md bg-black/55 px-pad-atom text-xs text-white">
            +{product.photoCount - 1}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-atom p-pad-atom-md">
        <p className="truncate text-sm font-medium text-foreground">{product.title}</p>
        <p className="text-xs text-muted">
          {formatTomanFromRial(product.priceRial)} تومان
        </p>
        <span
          className={cn(
            "w-fit rounded-full px-pad-atom text-[10px] font-medium",
            product.status === "complete"
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning",
          )}
        >
          {tStatus(product.status)}
        </span>
      </div>
    </Link>
  );
}
