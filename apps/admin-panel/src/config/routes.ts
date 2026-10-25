export const ROUTES = {
  login: "/login",
  adminRoot: "/admin",
  adminDashboard: "/admin/dashboard",
  adminDatabase: "/admin/database",
  adminProjectSettings: "/admin/project/settings",
  adminProjectDatabase: "/admin/project/database",
  adminProjectSmsProviders: "/admin/project/sms-providers",
  adminProjectShippingProviders: "/admin/project/shipping-providers",
  adminProjectPaymentAccounts: "/admin/project/payment-accounts",
  adminProjectNotifications: "/admin/project/notifications",
  adminDeposits: "/admin/deposits",
  adminProducts: "/admin/products",
  adminProductsJourneyLab: "/admin/products/journey-lab",
  adminCategories: "/admin/categories",
  adminBrands: "/admin/brands",
  adminTags: "/admin/tags",
  adminHomepage: "/admin/homepage",
  adminShopPages: "/admin/shop-pages",
  adminBlog: "/admin/blog",
  adminBlogCategories: "/admin/blog/categories",
  adminBlogTags: "/admin/blog/tags",
  adminMedia: "/admin/media",
  adminOrders: "/admin/orders",
  adminCustomers: "/admin/customers",
  adminCoupons: "/admin/coupons",
  adminPromotions: "/admin/promotions",
  adminReports: "/admin/reports",
  adminUsers: "/admin/users",
  adminRoles: "/admin/roles",
  panelDashboard: "/dashboard",
  blog: "/blog",
} as const;

export type AdminNavLink = {
  kind: "link";
  href: string;
  labelKey: string;
  permission?: string;
};

export type AdminNavGroup = {
  kind: "group";
  labelKey: string;
  iconKey?: "shield" | "settings" | "package" | "commerce" | "blog" | "storePages" | "image";
  permission?: string;
  children: Array<{ href: string; labelKey: string; permission?: string }>;
};

export type AdminNavItem = AdminNavLink | AdminNavGroup;

export const ADMIN_NAV: AdminNavItem[] = [
  { kind: "link", href: ROUTES.adminDashboard, labelKey: "nav.dashboard" },
  {
    kind: "link",
    href: ROUTES.adminOrders,
    labelKey: "nav.orders",
    permission: "orders.view",
  },
  {
    kind: "link",
    href: ROUTES.adminCustomers,
    labelKey: "nav.customers",
    permission: "orders.view",
  },
  {
    kind: "group",
    labelKey: "nav.catalogGroup",
    iconKey: "package",
    permission: "products.view",
    children: [
      { href: ROUTES.adminProducts, labelKey: "nav.products" },
      { href: ROUTES.adminProductsJourneyLab, labelKey: "nav.productJourneyLab" },
      { href: ROUTES.adminCategories, labelKey: "nav.categories" },
      { href: ROUTES.adminBrands, labelKey: "nav.brands" },
      { href: ROUTES.adminTags, labelKey: "nav.tags" },
    ],
  },
  {
    kind: "link",
    href: ROUTES.adminMedia,
    labelKey: "nav.media",
    permission: "products.view",
  },
  {
    kind: "group",
    labelKey: "nav.storePagesGroup",
    iconKey: "storePages",
    children: [
      { href: ROUTES.adminHomepage, labelKey: "nav.homepage", permission: "shop_pages.view" },
      { href: ROUTES.adminShopPages, labelKey: "nav.shopPages", permission: "shop_pages.view" },
      { href: ROUTES.adminBlog, labelKey: "nav.blogPosts", permission: "blog.view" },
      { href: ROUTES.adminBlogCategories, labelKey: "nav.blogCategories", permission: "blog.view" },
      { href: ROUTES.adminBlogTags, labelKey: "nav.blogTags", permission: "blog.view" },
    ],
  },
  {
    kind: "group",
    labelKey: "nav.commerceGroup",
    iconKey: "commerce",
    children: [
      { href: ROUTES.adminDeposits, labelKey: "nav.deposits", permission: "orders.view" },
      { href: ROUTES.adminCoupons, labelKey: "nav.coupons", permission: "coupons.manage" },
      { href: ROUTES.adminPromotions, labelKey: "nav.promotions", permission: "coupons.manage" },
    ],
  },
  {
    kind: "group",
    labelKey: "nav.projectGroup",
    iconKey: "settings",
    permission: "settings.manage",
    children: [
      { href: ROUTES.adminProjectSettings, labelKey: "nav.projectSettings", permission: "settings.manage" },
      { href: ROUTES.adminProjectPaymentAccounts, labelKey: "nav.paymentAccounts", permission: "settings.manage" },
      { href: ROUTES.adminProjectNotifications, labelKey: "nav.notifications", permission: "settings.manage" },
      { href: ROUTES.adminProjectSmsProviders, labelKey: "nav.smsProviders", permission: "settings.manage" },
      { href: ROUTES.adminProjectShippingProviders, labelKey: "nav.shippingProviders", permission: "settings.manage" },
      { href: ROUTES.adminProjectDatabase, labelKey: "nav.database", permission: "settings.manage" },
    ],
  },
  {
    kind: "group",
    labelKey: "nav.accessGroup",
    iconKey: "shield",
    permission: "users.view",
    children: [
      { href: ROUTES.adminUsers, labelKey: "nav.users" },
      { href: ROUTES.adminRoles, labelKey: "nav.roles" },
    ],
  },
];
