export const PRODUCT_UNITS = [
  "piece",
  "pack",
  "kilogram",
  "gram",
  "meter",
  "liter",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export type ProductStatus = "basic" | "complete";

export type VariantAttributeKind = "color" | "size" | "custom" | "none";

export type VariantRow = {
  id: string;
  attr1Value: string;
  attr2Value?: string;
  priceRial: number;
  active: boolean;
};

export type ProductVariants = {
  attr1: { kind: VariantAttributeKind; label?: string; values: string[] };
  attr2?: { kind: VariantAttributeKind; label?: string; values: string[] };
  rows: VariantRow[];
};

export type CategoryKind = "real" | "virtual";

export type BrandRecord = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  imageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  description: string;
  imageId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecord = {
  id: string;
  userId: string;
  title: string;
  priceRial: number;
  description: string;
  mediaIds: string[];
  brandId: string | null;
  categoryId: string | null;
  groupCategoryIds: string[];
  unit: ProductUnit;
  status: ProductStatus;
  variants?: ProductVariants;
  createdAt: string;
  updatedAt: string;
};

export type MediaRecord = {
  fileId: string;
  userId: string;
  productIds: string[];
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductsStoreDocument = {
  products: ProductRecord[];
  media: MediaRecord[];
  brands: BrandRecord[];
  categories: CategoryRecord[];
};

export type ProductListItem = ProductRecord & {
  coverUrl: string | null;
  photoCount: number;
  brandName?: string | null;
  categoryName?: string | null;
};

export type BrandListItem = BrandRecord & {
  imageUrl: string | null;
};

export type CategoryListItem = CategoryRecord & {
  imageUrl: string | null;
  parentName?: string | null;
};

export type DashboardStats = {
  total: number;
  basicCount: number;
  averagePriceToman: number | null;
};
