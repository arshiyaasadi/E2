import {
  adminOverviewHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
} from "@/lib/api/server/handlers/auth.handler";
import {
  createAdminUserHandler,
  deleteAdminUserHandler,
  getAdminUserHandler,
  listAdminUsersHandler,
  updateAdminUserHandler,
} from "@/lib/api/server/handlers/admin-users.handler";
import { databaseSchemaHandler } from "@/lib/api/server/handlers/schema.handler";
import {
  getRoleHandler,
  listPermissionsHandler,
  listRolesHandler,
  updateRoleHandler,
} from "@/lib/api/server/handlers/roles.handler";
import { listAuditLogsHandler } from "@/lib/api/server/handlers/audit.handler";
import {
  createShippingMethodHandler,
  deleteShippingMethodHandler,
  getStoreSettingsHandler,
  listOrderStatusesHandler,
  listPaymentGatewaysHandler,
  listShippingMethodsHandler,
  updatePaymentGatewayHandler,
  updateShippingMethodHandler,
  updateStoreSettingsHandler,
} from "@/lib/api/server/handlers/project.handler";
import {
  invokeSmsProviderHandler,
  listSmsProvidersHandler,
  updateSmsProviderHandler,
} from "@/lib/api/server/handlers/sms.handler";
import {
  invokeShippingProviderHandler,
  listShippingProvidersHandler,
  updateShippingProviderHandler,
} from "@/lib/api/server/handlers/shipping.handler";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryHandler,
  listCategoriesHandler,
  reorderCategoriesHandler,
  updateCategoryHandler,
} from "@/lib/api/server/handlers/categories.handler";
import {
  createBrandHandler,
  deleteBrandHandler,
  getBrandHandler,
  listBrandsHandler,
  updateBrandHandler,
} from "@/lib/api/server/handlers/brands.handler";
import {
  createProductHandler,
  deleteProductHandler,
  getProductDetailHandler,
  getProductHandler,
  listProductsHandler,
  updateProductHandler,
} from "@/lib/api/server/handlers/products.handler";
import {
  createTagHandler,
  deleteTagHandler,
  getTagHandler,
  listTagsHandler,
  updateTagHandler,
} from "@/lib/api/server/handlers/tags.handler";
import {
  createShopPageHandler,
  deleteShopPageHandler,
  getShopPageHandler,
  listShopPagesHandler,
  updateShopPageHandler,
} from "@/lib/api/server/handlers/shop-pages.handler";
import {
  createHomepageSectionHandler,
  deleteHomepageSectionHandler,
  getHomepageSectionHandler,
  listHomepageSectionsHandler,
  reorderHomepageSectionHandler,
  updateHomepageSectionHandler,
} from "@/lib/api/server/handlers/homepage-sections.handler";
import {
  deleteMediaHandler,
  getMediaHandler,
  listMediaHandler,
  updateMediaHandler,
} from "@/lib/api/server/handlers/media.handler";
import {
  createCouponHandler,
  deleteCouponHandler,
  getCouponHandler,
  listCouponsHandler,
  updateCouponHandler,
} from "@/lib/api/server/handlers/coupons.handler";
import {
  createPromotionHandler,
  deletePromotionHandler,
  getPromotionHandler,
  listPromotionsHandler,
  updatePromotionHandler,
} from "@/lib/api/server/handlers/promotions.handler";
import {
  deleteCustomerHandler,
  getCustomerHandler,
  getCustomerLoginLogsHandler,
  getCustomerStatsHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from "@/lib/api/server/handlers/customers.handler";
import {
  approveOrderPaymentHandler,
  getOrderHandler,
  listOrdersHandler,
  rejectOrderPaymentHandler,
  updateOrderStatusHandler,
} from "@/lib/api/server/handlers/orders.handler";
import { getReportsDashboardHandler } from "@/lib/api/server/handlers/reports.handler";
import {
  createBlogCategoryHandler,
  createBlogPostHandler,
  createBlogTagHandler,
  deleteBlogCategoryHandler,
  deleteBlogPostHandler,
  deleteBlogTagHandler,
  getBlogCategoryHandler,
  getBlogPostHandler,
  getBlogTagHandler,
  listBlogCategoriesHandler,
  listBlogPostsHandler,
  listBlogTagsHandler,
  patchBlogPostHandler,
  previewBlogPostHandler,
  searchBlogInternalLinksHandler,
  updateBlogCategoryHandler,
  updateBlogPostHandler,
  updateBlogTagHandler,
} from "@/lib/api/server/handlers/blog.handler";
import {
  publicGetBlogPostHandler,
  publicListBlogPostsHandler,
} from "@/lib/api/server/handlers/public-blog.handler";

export interface BffContext {
  body?: unknown;
  params: Record<string, string>;
  searchParams?: URLSearchParams;
}

type RouteHandler = (ctx: BffContext) => Promise<unknown>;

const exactRoutes: Record<string, RouteHandler> = {
  "POST:/auth/login": (ctx) => loginHandler(ctx.body),
  "POST:/auth/logout": () => logoutHandler(),
  "POST:/auth/refresh": () => refreshHandler(),
  "GET:/auth/me": () => meHandler(),
  "GET:/admin/overview": () => adminOverviewHandler(),
  "GET:/admin/schema": () => databaseSchemaHandler(),
  "GET:/admin/users": () => listAdminUsersHandler(),
  "POST:/admin/users": ({ body }) => createAdminUserHandler(body),
  "GET:/admin/roles": () => listRolesHandler(),
  "GET:/admin/permissions": () => listPermissionsHandler(),
  "GET:/admin/audit-logs": ({ searchParams }) =>
    listAuditLogsHandler(searchParams ?? new URLSearchParams()),
  "GET:/admin/project/store-settings": () => getStoreSettingsHandler(),
  "PUT:/admin/project/store-settings": ({ body }) => updateStoreSettingsHandler(body),
  "GET:/admin/project/shipping-methods": () => listShippingMethodsHandler(),
  "POST:/admin/project/shipping-methods": ({ body }) => createShippingMethodHandler(body),
  "GET:/admin/project/payment-gateways": () => listPaymentGatewaysHandler(),
  "GET:/admin/project/sms-providers": () => listSmsProvidersHandler(),
  "GET:/admin/project/shipping-providers": () => listShippingProvidersHandler(),
  "GET:/admin/project/order-statuses": () => listOrderStatusesHandler(),
  "GET:/admin/categories": () => listCategoriesHandler(),
  "POST:/admin/categories": ({ body }) => createCategoryHandler(body),
  "PUT:/admin/categories/reorder": ({ body }) => reorderCategoriesHandler(body),
  "GET:/admin/brands": () => listBrandsHandler(),
  "POST:/admin/brands": ({ body }) => createBrandHandler(body),
  "GET:/admin/tags": () => listTagsHandler(),
  "POST:/admin/tags": ({ body }) => createTagHandler(body),
  "GET:/admin/shop-pages": () => listShopPagesHandler(),
  "POST:/admin/shop-pages": ({ body }) => createShopPageHandler(body),
  "GET:/admin/homepage-sections": () => listHomepageSectionsHandler(),
  "POST:/admin/homepage-sections": ({ body }) => createHomepageSectionHandler(body),
  "GET:/admin/products": ({ searchParams }) =>
    listProductsHandler(searchParams ?? new URLSearchParams()),
  "POST:/admin/products": ({ body }) => createProductHandler(body),
  "GET:/admin/coupons": () => listCouponsHandler(),
  "POST:/admin/coupons": ({ body }) => createCouponHandler(body),
  "GET:/admin/promotions": () => listPromotionsHandler(),
  "POST:/admin/promotions": ({ body }) => createPromotionHandler(body),
  "GET:/admin/customers": ({ searchParams }) =>
    listCustomersHandler(searchParams ?? new URLSearchParams()),
  "GET:/admin/customers/stats": ({ searchParams }) =>
    getCustomerStatsHandler(searchParams ?? new URLSearchParams()),
  "GET:/admin/orders": ({ searchParams }) =>
    listOrdersHandler(searchParams ?? new URLSearchParams()),
  "GET:/admin/media": ({ searchParams }) =>
    listMediaHandler(searchParams ?? new URLSearchParams()),
  "GET:/admin/reports": () => getReportsDashboardHandler(),
  "GET:/admin/blog/categories": () => listBlogCategoriesHandler(),
  "POST:/admin/blog/categories": ({ body }) => createBlogCategoryHandler(body),
  "GET:/admin/blog/tags": () => listBlogTagsHandler(),
  "POST:/admin/blog/tags": ({ body }) => createBlogTagHandler(body),
  "GET:/admin/blog/posts": ({ searchParams }) =>
    listBlogPostsHandler({ params: {}, searchParams: searchParams ?? new URLSearchParams() }),
  "POST:/admin/blog/posts": ({ body }) => createBlogPostHandler(body),
  "GET:/admin/blog/internal-links": ({ searchParams }) =>
    searchBlogInternalLinksHandler({
      params: {},
      searchParams: searchParams ?? new URLSearchParams(),
    }),
  "GET:/blog/posts": () => publicListBlogPostsHandler(),
};

const patternRoutes: Array<{
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}> = [
  {
    method: "GET",
    pattern: /^admin\/users\/([^/]+)$/,
    keys: ["id"],
    handler: getAdminUserHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/users\/([^/]+)$/,
    keys: ["id"],
    handler: updateAdminUserHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/users\/([^/]+)$/,
    keys: ["id"],
    handler: deleteAdminUserHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/roles\/([^/]+)$/,
    keys: ["id"],
    handler: getRoleHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/roles\/([^/]+)$/,
    keys: ["id"],
    handler: updateRoleHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/project\/shipping-methods\/([^/]+)$/,
    keys: ["id"],
    handler: updateShippingMethodHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/project\/shipping-methods\/([^/]+)$/,
    keys: ["id"],
    handler: deleteShippingMethodHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/project\/payment-gateways\/([^/]+)$/,
    keys: ["id"],
    handler: updatePaymentGatewayHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/project\/sms-providers\/([^/]+)$/,
    keys: ["id"],
    handler: updateSmsProviderHandler,
  },
  {
    method: "POST",
    pattern: /^admin\/project\/sms-providers\/([^/]+)\/invoke$/,
    keys: ["id"],
    handler: invokeSmsProviderHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/project\/shipping-providers\/([^/]+)$/,
    keys: ["id"],
    handler: updateShippingProviderHandler,
  },
  {
    method: "POST",
    pattern: /^admin\/project\/shipping-providers\/([^/]+)\/invoke$/,
    keys: ["id"],
    handler: invokeShippingProviderHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: getCategoryHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: updateCategoryHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: deleteCategoryHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/brands\/([^/]+)$/,
    keys: ["id"],
    handler: getBrandHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/brands\/([^/]+)$/,
    keys: ["id"],
    handler: updateBrandHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/brands\/([^/]+)$/,
    keys: ["id"],
    handler: deleteBrandHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: getTagHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: updateTagHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: deleteTagHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/shop-pages\/([^/]+)$/,
    keys: ["id"],
    handler: getShopPageHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/shop-pages\/([^/]+)$/,
    keys: ["id"],
    handler: updateShopPageHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/shop-pages\/([^/]+)$/,
    keys: ["id"],
    handler: deleteShopPageHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/homepage-sections\/([^/]+)$/,
    keys: ["id"],
    handler: getHomepageSectionHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/homepage-sections\/([^/]+)$/,
    keys: ["id"],
    handler: updateHomepageSectionHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/homepage-sections\/([^/]+)$/,
    keys: ["id"],
    handler: deleteHomepageSectionHandler,
  },
  {
    method: "POST",
    pattern: /^admin\/homepage-sections\/([^/]+)\/reorder$/,
    keys: ["id"],
    handler: reorderHomepageSectionHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/products\/([^/]+)\/detail$/,
    keys: ["id"],
    handler: getProductDetailHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/products\/([^/]+)$/,
    keys: ["id"],
    handler: getProductHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/products\/([^/]+)$/,
    keys: ["id"],
    handler: updateProductHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/products\/([^/]+)$/,
    keys: ["id"],
    handler: deleteProductHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/media\/([^/]+)$/,
    keys: ["id"],
    handler: (ctx) => getMediaHandler(ctx.params.id ?? ""),
  },
  {
    method: "PUT",
    pattern: /^admin\/media\/([^/]+)$/,
    keys: ["id"],
    handler: updateMediaHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/media\/([^/]+)$/,
    keys: ["id"],
    handler: deleteMediaHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/coupons\/([^/]+)$/,
    keys: ["id"],
    handler: getCouponHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/coupons\/([^/]+)$/,
    keys: ["id"],
    handler: updateCouponHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/coupons\/([^/]+)$/,
    keys: ["id"],
    handler: deleteCouponHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/promotions\/([^/]+)$/,
    keys: ["id"],
    handler: getPromotionHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/promotions\/([^/]+)$/,
    keys: ["id"],
    handler: updatePromotionHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/promotions\/([^/]+)$/,
    keys: ["id"],
    handler: deletePromotionHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/customers\/([^/]+)\/login-logs$/,
    keys: ["id"],
    handler: getCustomerLoginLogsHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/customers\/([^/]+)$/,
    keys: ["id"],
    handler: getCustomerHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/customers\/([^/]+)$/,
    keys: ["id"],
    handler: updateCustomerHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/customers\/([^/]+)$/,
    keys: ["id"],
    handler: deleteCustomerHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/orders\/([^/]+)$/,
    keys: ["id"],
    handler: getOrderHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/orders\/([^/]+)\/status$/,
    keys: ["id"],
    handler: updateOrderStatusHandler,
  },
  {
    method: "POST",
    pattern: /^admin\/orders\/([^/]+)\/payments\/([^/]+)\/approve$/,
    keys: ["id", "paymentId"],
    handler: approveOrderPaymentHandler,
  },
  {
    method: "POST",
    pattern: /^admin\/orders\/([^/]+)\/payments\/([^/]+)\/reject$/,
    keys: ["id", "paymentId"],
    handler: rejectOrderPaymentHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/blog\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: getBlogCategoryHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/blog\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: updateBlogCategoryHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/blog\/categories\/([^/]+)$/,
    keys: ["id"],
    handler: deleteBlogCategoryHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/blog\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: getBlogTagHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/blog\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: updateBlogTagHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/blog\/tags\/([^/]+)$/,
    keys: ["id"],
    handler: deleteBlogTagHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/blog\/posts\/([^/]+)\/preview$/,
    keys: ["id"],
    handler: previewBlogPostHandler,
  },
  {
    method: "GET",
    pattern: /^admin\/blog\/posts\/([^/]+)$/,
    keys: ["id"],
    handler: getBlogPostHandler,
  },
  {
    method: "PUT",
    pattern: /^admin\/blog\/posts\/([^/]+)$/,
    keys: ["id"],
    handler: updateBlogPostHandler,
  },
  {
    method: "PATCH",
    pattern: /^admin\/blog\/posts\/([^/]+)$/,
    keys: ["id"],
    handler: patchBlogPostHandler,
  },
  {
    method: "DELETE",
    pattern: /^admin\/blog\/posts\/([^/]+)$/,
    keys: ["id"],
    handler: deleteBlogPostHandler,
  },
  {
    method: "GET",
    pattern: /^blog\/posts\/([^/]+)$/,
    keys: ["slug"],
    handler: publicGetBlogPostHandler,
  },
];

export function resolveRoute(method: string, path: string): RouteHandler | null {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const exactKey = `${method.toUpperCase()}:/${normalized}`;
  if (exactRoutes[exactKey]) {
    return exactRoutes[exactKey];
  }

  for (const route of patternRoutes) {
    if (route.method !== method.toUpperCase()) continue;
    const match = normalized.match(route.pattern);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.keys.forEach((key, index) => {
      params[key] = match[index + 1];
    });

    return (ctx) => route.handler({ ...ctx, params });
  }

  return null;
}

export function bindRouteHandler(handler: RouteHandler, params: Record<string, string> = {}) {
  return (ctx: BffContext) => handler({ ...ctx, params: { ...params, ...ctx.params } });
}
