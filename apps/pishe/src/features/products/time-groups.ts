import type { ProductListItem } from "@/features/products/types";

export type TimeGroupKey = "thisWeek" | "lastWeek" | "thisMonth" | "older";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function groupKeyForDate(iso: string, now = new Date()): TimeGroupKey {
  const date = startOfDay(new Date(iso));
  const today = startOfDay(now);
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);

  if (diffDays < 7) return "thisWeek";
  if (diffDays < 14) return "lastWeek";
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  ) {
    return "thisMonth";
  }
  return "older";
}

export function groupProducts(products: ProductListItem[]) {
  const order: TimeGroupKey[] = ["thisWeek", "lastWeek", "thisMonth", "older"];
  const map = new Map<TimeGroupKey, ProductListItem[]>();
  for (const key of order) map.set(key, []);
  for (const product of products) {
    const key = groupKeyForDate(product.createdAt);
    map.get(key)!.push(product);
  }
  return order
    .map((key) => ({ key, items: map.get(key)! }))
    .filter((g) => g.items.length > 0);
}
