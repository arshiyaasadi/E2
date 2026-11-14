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
  profiles: {
    searchByInvite: "/profiles/search",
  },
  businesses: {
    list: "/businesses",
    adminList: "/admin/businesses",
    byId: (id: string) => `/businesses/${id}`,
    members: (id: string) => `/businesses/${id}/members`,
    member: (id: string, membershipId: string) =>
      `/businesses/${id}/members/${membershipId}`,
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
