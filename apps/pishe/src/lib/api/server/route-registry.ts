import {
  healthHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  sessionsHandler,
  updateProfileHandler,
} from "@/lib/api/server/handlers/auth.handler";
import {
  createBrandHandler,
  createCategoryHandler,
  deleteBrandHandler,
  deleteCategoryHandler,
  getBrandHandler,
  getCategoryHandler,
  listBrandsHandler,
  listCategoriesHandler,
  listMediaLibraryHandler,
  patchBrandHandler,
  patchCategoryHandler,
} from "@/lib/api/server/handlers/catalog.handler";
import {
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listProductsHandler,
  mediaUsageHandler,
  patchProductHandler,
} from "@/lib/api/server/handlers/products.handler";
import {
  addMemberHandler,
  createBusinessHandler,
  deleteBusinessHandler,
  getBusinessHandler,
  listAllBusinessesHandler,
  listMembersHandler,
  listMyBusinessesHandler,
  patchBusinessHandler,
  removeMemberHandler,
  searchProfileByInviteHandler,
} from "@/lib/api/server/handlers/businesses.handler";
import type { ApiResponse } from "@/types/api";

type RouteContext = {
  body?: unknown;
  searchParams?: URLSearchParams;
  params?: Record<string, string>;
};

type RouteHandler = (ctx: RouteContext) => Promise<ApiResponse<unknown>>;

type RouteEntry =
  | { kind: "exact"; key: string; handler: RouteHandler }
  | {
      kind: "pattern";
      method: string;
      match: (path: string) => Record<string, string> | null;
      handler: RouteHandler;
    };

const exactRoutes: Record<string, RouteHandler> = {
  "POST:auth/register": (ctx) => registerHandler(ctx.body),
  "POST:auth/login": (ctx) => loginHandler(ctx.body),
  "POST:auth/logout": () => logoutHandler(),
  "GET:auth/me": () => meHandler(),
  "PATCH:auth/profile": (ctx) => updateProfileHandler(ctx.body),
  "GET:auth/sessions": () => sessionsHandler(),
  "GET:health": () => healthHandler(),
  "GET:products": () => listProductsHandler(),
  "POST:products": (ctx) => createProductHandler(ctx.body),
  "GET:brands": () => listBrandsHandler(),
  "POST:brands": (ctx) => createBrandHandler(ctx.body),
  "GET:categories": () => listCategoriesHandler(),
  "POST:categories": (ctx) => createCategoryHandler(ctx.body),
  "GET:media/library": () => listMediaLibraryHandler(),
  "GET:businesses": () => listMyBusinessesHandler(),
  "GET:admin/businesses": () => listAllBusinessesHandler(),
  "POST:admin/businesses": (ctx) => createBusinessHandler(ctx.body),
  "GET:profiles/search": (ctx) => searchProfileByInviteHandler(ctx.searchParams),
};

function matchProductId(path: string): Record<string, string> | null {
  const m = /^products\/([^/]+)$/.exec(path);
  return m ? { productId: m[1] } : null;
}

function matchBrandId(path: string): Record<string, string> | null {
  const m = /^brands\/([^/]+)$/.exec(path);
  return m ? { brandId: m[1] } : null;
}

function matchCategoryId(path: string): Record<string, string> | null {
  const m = /^categories\/([^/]+)$/.exec(path);
  return m ? { categoryId: m[1] } : null;
}

function matchMediaUsage(path: string): Record<string, string> | null {
  const m = /^media\/([^/]+)\/usage$/.exec(path);
  return m ? { fileId: m[1] } : null;
}

function matchBusinessId(path: string): Record<string, string> | null {
  const m = /^businesses\/([^/]+)$/.exec(path);
  return m ? { businessId: m[1] } : null;
}

function matchAdminBusinessId(path: string): Record<string, string> | null {
  const m = /^admin\/businesses\/([^/]+)$/.exec(path);
  return m ? { businessId: m[1] } : null;
}

function matchBusinessMembers(path: string): Record<string, string> | null {
  const m = /^businesses\/([^/]+)\/members$/.exec(path);
  return m ? { businessId: m[1] } : null;
}

function matchBusinessMemberId(path: string): Record<string, string> | null {
  const m = /^businesses\/([^/]+)\/members\/([^/]+)$/.exec(path);
  return m ? { businessId: m[1], membershipId: m[2] } : null;
}

const patternRoutes: RouteEntry[] = [
  {
    kind: "pattern",
    method: "GET",
    match: matchProductId,
    handler: (ctx) => getProductHandler(ctx.params!.productId),
  },
  {
    kind: "pattern",
    method: "PATCH",
    match: matchProductId,
    handler: (ctx) => patchProductHandler(ctx.params!.productId, ctx.body),
  },
  {
    kind: "pattern",
    method: "DELETE",
    match: matchProductId,
    handler: (ctx) => deleteProductHandler(ctx.params!.productId),
  },
  {
    kind: "pattern",
    method: "GET",
    match: matchBrandId,
    handler: (ctx) => getBrandHandler(ctx.params!.brandId),
  },
  {
    kind: "pattern",
    method: "PATCH",
    match: matchBrandId,
    handler: (ctx) => patchBrandHandler(ctx.params!.brandId, ctx.body),
  },
  {
    kind: "pattern",
    method: "DELETE",
    match: matchBrandId,
    handler: (ctx) => deleteBrandHandler(ctx.params!.brandId),
  },
  {
    kind: "pattern",
    method: "GET",
    match: matchCategoryId,
    handler: (ctx) => getCategoryHandler(ctx.params!.categoryId),
  },
  {
    kind: "pattern",
    method: "PATCH",
    match: matchCategoryId,
    handler: (ctx) => patchCategoryHandler(ctx.params!.categoryId, ctx.body),
  },
  {
    kind: "pattern",
    method: "DELETE",
    match: matchCategoryId,
    handler: (ctx) => deleteCategoryHandler(ctx.params!.categoryId),
  },
  {
    kind: "pattern",
    method: "GET",
    match: matchMediaUsage,
    handler: (ctx) => mediaUsageHandler(ctx.params!.fileId),
  },
  {
    kind: "pattern",
    method: "GET",
    match: matchBusinessId,
    handler: (ctx) => getBusinessHandler(ctx.params!.businessId),
  },
  {
    kind: "pattern",
    method: "PATCH",
    match: matchAdminBusinessId,
    handler: (ctx) => patchBusinessHandler(ctx.params!.businessId, ctx.body),
  },
  {
    kind: "pattern",
    method: "DELETE",
    match: matchAdminBusinessId,
    handler: (ctx) => deleteBusinessHandler(ctx.params!.businessId),
  },
  {
    kind: "pattern",
    method: "GET",
    match: matchBusinessMembers,
    handler: (ctx) => listMembersHandler(ctx.params!.businessId),
  },
  {
    kind: "pattern",
    method: "POST",
    match: matchBusinessMembers,
    handler: (ctx) => addMemberHandler(ctx.params!.businessId, ctx.body),
  },
  {
    kind: "pattern",
    method: "DELETE",
    match: matchBusinessMemberId,
    handler: (ctx) =>
      removeMemberHandler(ctx.params!.businessId, ctx.params!.membershipId),
  },
];

export function resolveRoute(
  method: string,
  path: string,
): { handler: RouteHandler; params: Record<string, string> } | null {
  const exact = exactRoutes[`${method}:${path}`];
  if (exact) {
    return { handler: exact, params: {} };
  }

  for (const entry of patternRoutes) {
    if (entry.kind !== "pattern" || entry.method !== method) continue;
    const params = entry.match(path);
    if (params) {
      return { handler: entry.handler, params };
    }
  }

  return null;
}
