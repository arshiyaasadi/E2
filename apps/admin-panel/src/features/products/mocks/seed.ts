import type { ProductsMockState } from "./types";

function svgThumb(label: string, color: string) {
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect fill="${color}" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#fff" font-size="18">${label}</text></svg>`,
    )
  );
}

export const PRODUCTS_SEED: ProductsMockState = {
  categories: [
    { id: "cat_men", name: "مردانه" },
    { id: "cat_women", name: "زنانه" },
    { id: "cat_accessories", name: "اکسسوری" },
  ],
  galleryPool: [
    { id: "img_1", url: svgThumb("۱", "#1e3a5f"), name: "نمونه ۱" },
    { id: "img_2", url: svgThumb("۲", "#0f766e"), name: "نمونه ۲" },
    { id: "img_3", url: svgThumb("۳", "#7c2d12"), name: "نمونه ۳" },
    { id: "img_4", url: svgThumb("۴", "#334155"), name: "نمونه ۴" },
  ],
  products: [
    {
      id: "prod_demo",
      title: "کتانی شهری دمو",
      categoryId: "cat_men",
      categoryName: "مردانه",
      gallery: [
        { id: "img_1", url: svgThumb("۱", "#1e3a5f"), name: "نمونه ۱" },
        { id: "img_2", url: svgThumb("۲", "#0f766e"), name: "نمونه ۲" },
      ],
      status: "draft",
      options: [
        { key: "opt_color", name: "رنگ", values: ["مشکی", "سفید"] },
        { key: "opt_size", name: "سایز", values: ["۴۲", "۴۳"] },
      ],
      variants: [
        { key: "v1", labels: ["مشکی", "۴۲"], enabled: true, uplift: 0 },
        { key: "v2", labels: ["مشکی", "۴۳"], enabled: true, uplift: 50000 },
        { key: "v3", labels: ["سفید", "۴۲"], enabled: true, uplift: 0 },
        { key: "v4", labels: ["سفید", "۴۳"], enabled: false, uplift: 50000 },
      ],
      basePrice: 2_400_000,
      priceHistory: [
        {
          id: "ph1",
          at: "2026-03-01T10:00:00.000Z",
          oldPrice: null,
          newPrice: 2_200_000,
          note: "قیمت اولیه",
        },
        {
          id: "ph2",
          at: "2026-03-10T10:00:00.000Z",
          oldPrice: 2_200_000,
          newPrice: 2_400_000,
          note: "افزایش فصلی",
        },
      ],
      createdAt: "2026-03-01T09:00:00.000Z",
      updatedAt: "2026-03-10T10:00:00.000Z",
    },
  ],
};

export const OPTION_NAME_SUGGESTIONS = ["رنگ", "سایز", "جنس"] as const;
