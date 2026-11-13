export const BFF_API_BASE = "/api/v1";

export const ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    me: "/auth/me",
    sessions: "/auth/sessions",
    profile: "/auth/profile",
  },
  products: {
    list: "/products",
    byId: (id: string) => `/products/${id}`,
  },
  brands: {
    list: "/brands",
    byId: (id: string) => `/brands/${id}`,
  },
  categories: {
    list: "/categories",
    byId: (id: string) => `/categories/${id}`,
  },
  media: {
    upload: "/media",
    byId: (fileId: string) => `/media/${fileId}`,
    usage: (fileId: string) => `/media/${fileId}/usage`,
    library: "/media/library",
  },
} as const;
