export type MockGalleryItem = {
  id: string;
  url: string;
  name: string;
};

export type MockVariantOption = {
  key: string;
  name: string;
  values: string[];
};

export type MockVariantRow = {
  key: string;
  labels: string[];
  enabled: boolean;
  uplift: number;
};

export type MockPriceHistoryRow = {
  id: string;
  at: string;
  oldPrice: number | null;
  newPrice: number;
  note: string;
};

export type MockJourneyProduct = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryName: string | null;
  gallery: MockGalleryItem[];
  status: "draft";
  options: MockVariantOption[];
  variants: MockVariantRow[];
  basePrice: number | null;
  priceHistory: MockPriceHistoryRow[];
  createdAt: string;
  updatedAt: string;
};

export type MockCategory = {
  id: string;
  name: string;
};

export type ProductsMockState = {
  categories: MockCategory[];
  galleryPool: MockGalleryItem[];
  products: MockJourneyProduct[];
};
