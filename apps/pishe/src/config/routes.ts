export type AppCrumb = {
  label: string;
  href?: string;
};

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  products: "/products",
  productsList: "/products/list",
  productNew: "/products/new",
  product: (id: string) => `/products/${id}`,
  productEdit: (id: string) => `/products/${id}/edit`,
  productDetails: (id: string) => `/products/${id}/details`,
  productsPhotos: "/products/photos",
  brands: "/products/brands",
  brandNew: "/products/brands/new",
  brandEdit: (id: string) => `/products/brands/${id}/edit`,
  categories: "/products/categories",
  categoryNew: "/products/categories/new",
  categoryEdit: (id: string) => `/products/categories/${id}/edit`,
  notifications: "/notifications",
} as const;

export const AUTH_COOKIES = {
  access: "pishe_access",
  refresh: "pishe_refresh",
} as const;
