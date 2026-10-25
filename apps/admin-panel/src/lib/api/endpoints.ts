export const BFF_API_BASE = "/api/v1";

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
  },
  ADMIN: {
    OVERVIEW: "/admin/overview",
    SHOP_PAGES: {
      ROOT: "/admin/shop-pages",
      BY_ID: (id: string) => `/admin/shop-pages/${id}`,
    },
    HOMEPAGE_SECTIONS: {
      ROOT: "/admin/homepage-sections",
      BY_ID: (id: string) => `/admin/homepage-sections/${id}`,
      REORDER: (id: string) => `/admin/homepage-sections/${id}/reorder`,
    },
  },
} as const;
