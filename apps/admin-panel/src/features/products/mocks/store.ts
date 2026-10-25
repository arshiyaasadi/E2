"use client";

import { createMockStore, newId, useMockStore } from "@/features/mocks/create-store";
import { PRODUCTS_SEED } from "./seed";
import type {
  MockGalleryItem,
  MockJourneyProduct,
  MockVariantOption,
  MockVariantRow,
  ProductsMockState,
} from "./types";

const store = createMockStore<ProductsMockState>(PRODUCTS_SEED);

function nowIso() {
  return new Date().toISOString();
}

function cartesian(options: MockVariantOption[]): MockVariantRow[] {
  if (options.length === 0) return [];
  if (options.some((o) => o.values.length === 0)) return [];

  let combos: string[][] = [[]];
  for (const option of options) {
    combos = combos.flatMap((combo) => option.values.map((value) => [...combo, value]));
  }

  return combos.map((labels) => ({
    key: newId("var"),
    labels,
    enabled: true,
    uplift: 0,
  }));
}

export function createDraftProduct(input: {
  title: string;
  gallery: MockGalleryItem[];
  categoryId: string | null;
}): { ok: true; id: string } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title_required" };
  if (input.gallery.length === 0) return { ok: false, error: "gallery_required" };

  const category = PRODUCTS_SEED.categories.find((c) => c.id === input.categoryId) ?? null;
  const id = newId("prod");
  const at = nowIso();

  const product: MockJourneyProduct = {
    id,
    title,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    gallery: input.gallery,
    status: "draft",
    options: [],
    variants: [],
    basePrice: null,
    priceHistory: [],
    createdAt: at,
    updatedAt: at,
  };

  store.setState((prev) => ({
    ...prev,
    products: [product, ...prev.products],
  }));

  return { ok: true, id };
}

export function updateProductBasic(
  productId: string,
  input: { title: string; gallery: MockGalleryItem[]; categoryId: string | null },
): { ok: true } | { ok: false; error: string } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title_required" };
  if (input.gallery.length === 0) return { ok: false, error: "gallery_required" };

  const category = store.getState().categories.find((c) => c.id === input.categoryId) ?? null;

  store.setState((prev) => ({
    ...prev,
    products: prev.products.map((p) =>
      p.id === productId
        ? {
            ...p,
            title,
            gallery: input.gallery,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            updatedAt: nowIso(),
          }
        : p,
    ),
  }));
  return { ok: true };
}

export function updateProductVariants(
  productId: string,
  options: MockVariantOption[],
  variants: MockVariantRow[],
): { ok: true } | { ok: false; error: string } {
  if (options.length > 2) return { ok: false, error: "max_two_axes" };

  store.setState((prev) => ({
    ...prev,
    products: prev.products.map((p) =>
      p.id === productId
        ? {
            ...p,
            options,
            variants,
            updatedAt: nowIso(),
          }
        : p,
    ),
  }));
  return { ok: true };
}

export function regenerateVariantMatrix(options: MockVariantOption[]): MockVariantRow[] {
  return cartesian(options.slice(0, 2));
}

export function updateProductPricing(
  productId: string,
  basePrice: number,
  variantUplifts: Array<{ key: string; uplift: number }>,
): { ok: true } | { ok: false; error: string } {
  if (Number.isNaN(basePrice) || basePrice < 0) return { ok: false, error: "invalid_price" };

  store.setState((prev) => ({
    ...prev,
    products: prev.products.map((p) => {
      if (p.id !== productId) return p;
      const oldPrice = p.basePrice;
      const upliftMap = new Map(variantUplifts.map((u) => [u.key, u.uplift]));
      const at = nowIso();
      return {
        ...p,
        basePrice,
        variants: p.variants.map((v) => ({
          ...v,
          uplift: upliftMap.has(v.key) ? Math.max(0, upliftMap.get(v.key)!) : v.uplift,
        })),
        priceHistory:
          oldPrice !== basePrice
            ? [
                ...p.priceHistory,
                {
                  id: newId("ph"),
                  at,
                  oldPrice,
                  newPrice: basePrice,
                  note: "به‌روزرسانی از تب قیمت",
                },
              ]
            : p.priceHistory,
        updatedAt: at,
      };
    }),
  }));
  return { ok: true };
}

export function resetProductsMock() {
  store.reset();
}

export function useProductsMockState() {
  return useMockStore(store, (s) => s);
}

export function useJourneyProducts() {
  return useMockStore(store, (s) => s.products);
}

export function useJourneyProduct(productId: string | null) {
  return useMockStore(store, (s) => s.products.find((p) => p.id === productId) ?? null);
}
