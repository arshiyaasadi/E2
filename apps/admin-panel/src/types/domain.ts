export type AdminRoleName = "super_admin" | "admin" | "editor" | string;

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string | null;
  role: AdminRoleName;
  permissions?: string[];
}

export interface AdminOverview {
  productsCount: number;
  ordersCount: number;
  customersCount: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  roleId: string | null;
  roleName: string | null;
  roleDescription: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionDto {
  id: string;
  key: string;
  description: string | null;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  fullName?: string | null;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateAdminUserInput {
  email?: string;
  password?: string;
  fullName?: string | null;
  roleId?: string;
  isActive?: boolean;
}

export interface UpdateRoleInput {
  description?: string | null;
  permissionIds?: string[];
}

export interface AuditLogDto {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  snapshot: unknown;
  createdAt: string;
}

export interface StoreSettingsDto {
  id: string;
  taxRate: number;
  currency: string;
  cartTtlSeconds: number;
  reservationTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoreSettingsInput {
  taxRate: number;
  currency: string;
  cartTtlSeconds: number;
  reservationTtlSeconds: number;
}

export interface ShippingMethodDto {
  id: string;
  name: string;
  description: string | null;
  baseCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingMethodInput {
  name: string;
  description?: string | null;
  baseCost: number;
  isActive?: boolean;
}

export interface UpdateShippingMethodInput {
  name?: string;
  description?: string | null;
  baseCost?: number;
  isActive?: boolean;
}

export interface PaymentGatewayDto {
  id: string;
  code: string;
  name: string;
  settlementType: string;
  isActive: boolean;
  isEnabled: boolean;
  config: unknown;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePaymentGatewayInput {
  isActive?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  config?: Record<string, unknown>;
}

export interface OrderStatusDefinitionDto {
  code: string;
  labelFa: string;
  labelEn: string;
  sortOrder: number;
  isTerminal: boolean;
  allowedNextStatuses: string[];
}

export type SmsProviderCode = "smsir" | "console";

export type SmsFeatureId =
  | "verify"
  | "bulk"
  | "likeToLike"
  | "scheduled"
  | "cancelScheduled"
  | "messageStatus"
  | "packReports"
  | "liveReports"
  | "archiveReports"
  | "receive"
  | "credit"
  | "lines"
  | "sandbox";

export interface SmsFeatureDto {
  id: SmsFeatureId;
  supported: boolean;
}

export interface SmsProviderDto {
  id: string;
  code: SmsProviderCode;
  name: string;
  description: string | null;
  isActive: boolean;
  isEnabled: boolean;
  config: Record<string, unknown>;
  features: SmsFeatureDto[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSmsProviderInput {
  isActive?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  name?: string;
  description?: string | null;
  config?: Record<string, unknown>;
}

export type SmsProviderAction =
  | "sendVerify"
  | "sendBulk"
  | "sendLikeToLike"
  | "cancelScheduled"
  | "getMessageStatus"
  | "listTodayPacks"
  | "getPackMessages"
  | "listLiveMessages"
  | "listArchiveMessages"
  | "listLatestReceived"
  | "listLiveReceived"
  | "listArchiveReceived"
  | "getCredit"
  | "getLines";

export interface InvokeSmsProviderInput {
  action: SmsProviderAction;
  payload?: Record<string, unknown>;
}

export type ShippingProviderCode = "tipax" | "manual";

export type ShippingFeatureId =
  | "auth"
  | "addresses"
  | "cities"
  | "customers"
  | "orders"
  | "pricing"
  | "parcels"
  | "tracking"
  | "financial"
  | "ticketing"
  | "webhooks"
  | "locker";

export interface ShippingFeatureDto {
  id: ShippingFeatureId;
  supported: boolean;
}

export interface ShippingProviderDto {
  id: string;
  code: ShippingProviderCode;
  name: string;
  description: string | null;
  isActive: boolean;
  isEnabled: boolean;
  config: Record<string, unknown>;
  features: ShippingFeatureDto[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateShippingProviderInput {
  isActive?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  name?: string;
  description?: string | null;
  config?: Record<string, unknown>;
}

export type ShippingProviderAction = string;

export interface InvokeShippingProviderInput {
  action: ShippingProviderAction;
  payload?: Record<string, unknown>;
}

export interface MediaDto {
  id: string;
  storageKey: string;
  url: string;
  thumbUrl: string | null;
  folder: string;
  title: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  createdAt: string;
}

export interface MediaDetailDto extends MediaDto {
  usageCount: number;
}

export interface MediaListResultDto {
  items: MediaDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdateMediaInput {
  title?: string | null;
  altText?: string | null;
}

export type CategoryKind = "real" | "virtual";

export type DescriptionBlock =
  | { type: "text"; body: string }
  | { type: "checklist"; items: string[] }
  | { type: "table"; rows: { label: string; value: string }[] };

export type CategoryPageSettings = {
  bannerEnabled?: boolean;
  bannerTitle?: string;
  bannerSubtitle?: string;
  showProductCount?: boolean;
};

/** Saved filter preset (AND across keys, OR within arrays) */
export type ShopPageFilters = {
  q?: string;
  category?: string[];
  audience?: Array<"men" | "women" | "kids">;
  color?: string[];
  size?: number[];
  minPrice?: number;
  maxPrice?: number;
  sale?: boolean;
  inStock?: boolean;
  featured?: boolean;
  tag?: string[];
  brand?: string[];
  sort?: "newest" | "price_asc" | "price_desc" | "popular" | "discount";
};

export interface CategoryGalleryItem {
  mediaId: string;
  position: number;
  media: MediaDto;
}

export interface CategoryPinnedProductDto {
  productId: string;
  position: number;
  title: string;
  slug: string;
  status: string;
}

export interface CategoryDto {
  id: string;
  parentId: string | null;
  name: string;
  nameFa: string;
  slug: string;
  description: string | null;
  kind: CategoryKind;
  menuVisible: boolean;
  filters: ShopPageFilters;
  descriptionBlocks: DescriptionBlock[];
  pageSettings: CategoryPageSettings;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  ogImage: MediaDto | null;
  imageId: string | null;
  image: MediaDto | null;
  gallery: CategoryGalleryItem[];
  pinnedProducts: CategoryPinnedProductDto[];
  pinnedProductIds: string[];
  canonicalUrl: string | null;
  metaRobots: string;
  position: number;
  collectionPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySeoInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
}

export interface CreateCategoryInput extends CategorySeoInput {
  name: string;
  nameFa: string;
  slug?: string;
  description?: string | null;
  kind?: CategoryKind;
  menuVisible?: boolean;
  filters?: ShopPageFilters;
  descriptionBlocks?: DescriptionBlock[];
  pageSettings?: CategoryPageSettings;
  parentId?: string | null;
  imageId?: string | null;
  galleryMediaIds?: string[];
  pinnedProductIds?: string[];
  position?: number;
}

export interface UpdateCategoryInput extends CategorySeoInput {
  name?: string;
  nameFa?: string;
  slug?: string;
  description?: string | null;
  kind?: CategoryKind;
  menuVisible?: boolean;
  filters?: ShopPageFilters;
  descriptionBlocks?: DescriptionBlock[];
  pageSettings?: CategoryPageSettings;
  parentId?: string | null;
  imageId?: string | null;
  galleryMediaIds?: string[];
  pinnedProductIds?: string[];
  position?: number;
}

export type CategoryReorderItem = {
  id: string;
  parentId: string | null;
  position: number;
};


export type ProductStatus = "draft" | "active" | "archived";
export type ProductType = "physical" | "digital";

export interface BrandDto {
  id: string;
  name: string;
  nameFa: string;
  slug: string;
  imageId: string | null;
  image: MediaDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandInput {
  name: string;
  nameFa: string;
  slug?: string;
  imageId?: string | null;
}

export interface UpdateBrandInput {
  name?: string;
  nameFa?: string;
  slug?: string;
  imageId?: string | null;
}

export interface TagDto {
  id: string;
  name: string;
  nameFa: string;
  slug: string;
  createdAt: string;
}

export interface CreateTagInput {
  name: string;
  nameFa: string;
  slug?: string;
}

export interface UpdateTagInput {
  name?: string;
  nameFa?: string;
  slug?: string;
}

export type ShopPageType = "search" | "landing";
export type ShopPageStatus = "draft" | "published";

export type HomepageSectionType = "product_grid" | "product_rail" | "sale_grid";
export type HomepageGridLayout = "cols3" | "cols4";

export interface HomepageSectionDto {
  id: string;
  title: string;
  subtitle: string | null;
  sectionType: HomepageSectionType;
  filters: Record<string, unknown>;
  shopPageId: string | null;
  shopPageTitle: string | null;
  productLimit: number;
  gridLayout: HomepageGridLayout;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomepageSectionInput {
  title: string;
  subtitle?: string | null;
  sectionType: HomepageSectionType;
  filters?: Record<string, unknown>;
  shopPageId?: string | null;
  productLimit?: number;
  gridLayout?: HomepageGridLayout;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface UpdateHomepageSectionInput {
  title?: string;
  subtitle?: string | null;
  sectionType?: HomepageSectionType;
  filters?: Record<string, unknown>;
  shopPageId?: string | null;
  productLimit?: number;
  gridLayout?: HomepageGridLayout;
  sortOrder?: number;
  isEnabled?: boolean;
}

export interface ShopPageDto {
  id: string;
  slug: string;
  title: string;
  titleFa: string | null;
  description: string | null;
  type: ShopPageType;
  status: ShopPageStatus;
  isMain: boolean;
  mapsCategorySlug: string | null;
  filters: Record<string, unknown>;
  pinnedProductIds: string[];
  blocks: unknown[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoImageId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShopPageInput {
  title: string;
  titleFa?: string | null;
  description?: string | null;
  slug?: string;
  type: ShopPageType;
  status?: ShopPageStatus;
  isMain?: boolean;
  mapsCategorySlug?: string | null;
  filters?: Record<string, unknown>;
  pinnedProductIds?: string[];
  blocks?: unknown[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageId?: string | null;
}

export interface UpdateShopPageInput {
  title?: string;
  titleFa?: string | null;
  description?: string | null;
  slug?: string;
  type?: ShopPageType;
  status?: ShopPageStatus;
  isMain?: boolean;
  mapsCategorySlug?: string | null;
  filters?: Record<string, unknown>;
  pinnedProductIds?: string[];
  blocks?: unknown[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageId?: string | null;
}

export interface ProductTagRef {
  id: string;
  name: string;
  nameFa: string;
  slug: string;
}

export interface ProductOptionValueDto {
  id: string;
  optionId: string;
  value: string;
  position: number;
}

export interface ProductOptionDto {
  id: string;
  productId: string;
  name: string;
  position: number;
  values: ProductOptionValueDto[];
}

export interface ProductVariantOptionValueRef {
  id: string;
  value: string;
  position: number;
  optionId: string;
  optionName: string;
}

export interface ProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  price: number | null;
  comparePrice: number | null;
  mediaId: string | null;
  media: MediaDto | null;
  isDefault: boolean;
  optionValues: ProductVariantOptionValueRef[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryDto {
  id: string;
  variantId: string | null;
  variantSku: string | null;
  productId: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  actorType: string;
  actorId: string | null;
  createdAt: string;
}

export interface ProductSnapshotDto {
  id: string;
  productId: string;
  snapshot: unknown;
  actorType: string;
  actorId: string | null;
  createdAt: string;
}

export interface ProductVariantsInput {
  options: Array<{
    id?: string;
    name: string;
    position: number;
    values: Array<{
      id?: string;
      key?: string;
      value: string;
      position: number;
    }>;
  }>;
  variants: Array<{
    id?: string;
    sku: string;
    price?: number | null;
    comparePrice?: number | null;
    mediaId?: string | null;
    isDefault?: boolean;
    optionValueKeys: string[];
  }>;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
  position: number;
}

export interface ProductMediaItem extends MediaDto {
  position: number;
}

export interface ProductDto {
  id: string;
  categoryId: string | null;
  categoryIds: string[];
  categories: ProductCategoryRef[];
  tagIds: string[];
  tags: ProductTagRef[];
  brandId: string | null;
  title: string;
  slug: string;
  description: string | null;
  descriptionBlocks: DescriptionBlock[];
  productType: ProductType;
  status: ProductStatus;
  basePrice: number | null;
  comparePrice: number | null;
  isRefundable: boolean;
  isFeatured: boolean;
  popularityScore: number;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string } | null;
  featuredImageId: string | null;
  featuredImage: MediaDto | null;
  media: ProductMediaItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  ogImage: MediaDto | null;
  canonicalUrl: string | null;
  metaRobots: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetailDto extends ProductDto {
  options: ProductOptionDto[];
  variants: ProductVariantDto[];
  priceHistory: PriceHistoryDto[];
  productHistory: ProductSnapshotDto[];
}

export interface ProductSeoInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
}

export interface ProductListFilters {
  q?: string;
  status?: ProductStatus;
  productType?: ProductType;
  brandId?: string;
  categoryId?: string;
}

export interface CreateProductInput extends ProductSeoInput {
  title: string;
  slug?: string;
  description?: string | null;
  descriptionBlocks?: DescriptionBlock[];
  productType?: ProductType;
  status?: ProductStatus;
  categoryId?: string | null;
  categoryIds?: string[];
  brandId?: string | null;
  basePrice?: number | null;
  comparePrice?: number | null;
  isRefundable?: boolean;
  isFeatured?: boolean;
  popularityScore?: number;
  featuredImageId?: string | null;
  mediaIds?: string[];
  tagIds?: string[];
  variants?: ProductVariantsInput;
}

export interface UpdateProductInput extends ProductSeoInput {
  title?: string;
  slug?: string;
  description?: string | null;
  descriptionBlocks?: DescriptionBlock[];
  productType?: ProductType;
  status?: ProductStatus;
  categoryId?: string | null;
  categoryIds?: string[];
  brandId?: string | null;
  basePrice?: number | null;
  comparePrice?: number | null;
  isRefundable?: boolean;
  isFeatured?: boolean;
  popularityScore?: number;
  featuredImageId?: string | null;
  mediaIds?: string[];
  tagIds?: string[];
  variants?: ProductVariantsInput;
}

export type CouponBenefitType = "percentage" | "fixed" | "free_shipping";
export type CouponScopeType = "order" | "category" | "product" | "first_order";

export interface CouponScopeDto {
  id: string;
  scopeType: CouponScopeType;
  scopeId: string | null;
}

export interface CouponDto {
  id: string;
  code: string;
  benefitType: CouponBenefitType;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isWelcome: boolean;
  scopes: CouponScopeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponScopeInput {
  scopeType: CouponScopeType;
  scopeId?: string | null;
}

export interface CreateCouponInput {
  code: string;
  benefitType: CouponBenefitType;
  value?: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  isWelcome?: boolean;
  scopes?: CouponScopeInput[];
}

export type UpdateCouponInput = Partial<CreateCouponInput>;

export type PromotionType = "percentage" | "fixed";
export type PromotionTargetType = "category" | "product";

export interface PromotionTargetDto {
  id: string;
  targetType: PromotionTargetType;
  targetId: string;
}

export interface PromotionDto {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  targets: PromotionTargetDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PromotionTargetInput {
  targetType: PromotionTargetType;
  targetId: string;
}

export interface CreatePromotionInput {
  name: string;
  type: PromotionType;
  value: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  targets?: PromotionTargetInput[];
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export type OrderStatusCode =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  currency: string;
  grandTotal: number;
  customerId: string;
  customerEmail: string;
  customerName: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResultDto {
  items: OrderSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface OrderItemDto {
  id: string;
  variantId: string;
  productTitle: string;
  variantSku: string;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  taxAmount: number;
  lineTotal: number;
}

export interface OrderPaymentDto {
  id: string;
  gatewayId: string;
  amount: number;
  currency: string;
  status: string;
  externalId: string | null;
  paidAt: string | null;
  createdAt: string;
  mediaUrl?: string | null;
  rejectReason?: string | null;
  reviewedAt?: string | null;
  gatewayCode?: string | null;
  gatewayName?: string | null;
}

export interface OrderStatusHistoryDto {
  id: string;
  fromStatus: OrderStatusCode | null;
  toStatus: OrderStatusCode;
  actorType: string;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface OrderDetailDto {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  couponCode: string | null;
  couponId: string | null;
  shippingMethodId: string | null;
  shippingMethodName: string | null;
  shippingAddress: unknown;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  allowedNextStatuses: OrderStatusCode[];
  isTerminal: boolean;
  customer: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
  };
  items: OrderItemDto[];
  payments: OrderPaymentDto[];
  statusHistory: OrderStatusHistoryDto[];
}

export interface UpdateOrderStatusInput {
  status: OrderStatusCode;
  trackingNumber?: string | null;
  note?: string | null;
}

export interface CustomerSummaryDto {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  ordersCount: number;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}

export interface CustomerListResultDto {
  items: CustomerSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomerGrowthPointDto {
  date: string;
  count: number;
}

export interface CustomerStatsDto {
  total: number;
  range: "week" | "month";
  days: number;
  periodTotal: number;
  series: CustomerGrowthPointDto[];
}

export interface CustomerAddressDto {
  id: string;
  type: "shipping" | "billing";
  fullName: string;
  phone: string;
  province: string;
  city: string;
  provinceId: number | null;
  cityId: number | null;
  addressLine: string;
  buildingNumber: string | null;
  unit: string | null;
  floor: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  tipaxCityId: number | null;
  createdAt: string;
}

export interface CustomerProfileDto {
  userId: string;
  email: string;
  phone: string;
  fullName: string | null;
  addresses: CustomerAddressDto[];
}

export interface CustomerAddressInput {
  type?: "shipping" | "billing";
  fullName?: string;
  province: string;
  city: string;
  provinceId: number;
  cityId: number;
  addressLine: string;
  postalCode: string;
  buildingNumber: string;
  unit: string;
  latitude: number;
  longitude: number;
}

export interface CustomerLoginLogDto {
  id: string;
  method: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CustomerDetailDto {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  ordersCount: number;
  wishlistCount: number;
  createdAt: string;
  updatedAt: string;
  addresses: CustomerAddressDto[];
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatusCode;
    grandTotal: number;
    createdAt: string;
  }>;
  wishlist: Array<{
    productId: string;
    title: string;
    slug: string;
    basePrice: number | null;
    status: string;
    addedAt: string;
  }>;
  cart: {
    id: string;
    expiresAt: string;
    items: Array<{
      id: string;
      variantId: string;
      productTitle: string;
      variantSku: string;
      quantity: number;
    }>;
  } | null;
  couponUsages: Array<{
    id: string;
    couponCode: string;
    orderId: string;
    orderNumber: string;
    usedAt: string;
  }>;
}

export interface UpdateCustomerInput {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export interface ReportsSummaryDto {
  totalRevenue: number;
  revenueThisMonth: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  averageOrderValue: number;
  pendingOrders: number;
  activeProducts: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  paidOrdersCount: number;
}

export interface ReportsOrderStatusRowDto {
  status: OrderStatusCode;
  count: number;
  revenue: number;
}

export interface ReportsRecentOrderDto {
  id: string;
  orderNumber: string;
  status: OrderStatusCode;
  grandTotal: number;
  customerEmail: string;
  customerName: string | null;
  createdAt: string;
}

export interface ReportsTopProductDto {
  productTitle: string;
  variantSku: string;
  quantitySold: number;
  revenue: number;
}

export interface ReportsDashboardDto {
  summary: ReportsSummaryDto;
  ordersByStatus: ReportsOrderStatusRowDto[];
  recentOrders: ReportsRecentOrderDto[];
  topProducts: ReportsTopProductDto[];
  couponStats: {
    activeCoupons: number;
    totalRedemptions: number;
  };
}

export type BlogPostStatus = "draft" | "pending" | "published";

export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogCategoryDto {
  id: string;
  parentId: string | null;
  name: string | null;
  nameFa: string;
  slug: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogCategoryInput {
  parentId?: string | null;
  name?: string | null;
  nameFa: string;
  slug: string;
  description?: string | null;
  position?: number;
}

export interface UpdateBlogCategoryInput {
  parentId?: string | null;
  name?: string | null;
  nameFa?: string;
  slug?: string;
  description?: string | null;
  position?: number;
}

export interface BlogTagDto {
  id: string;
  name: string | null;
  nameFa: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogTagInput {
  name?: string | null;
  nameFa: string;
  slug: string;
}

export interface UpdateBlogTagInput {
  name?: string | null;
  nameFa?: string;
  slug?: string;
}

export interface BlogEmbeddedProductDto {
  id: string;
  title: string;
  slug: string;
  basePrice: number | null;
  comparePrice: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  status: string;
}

export interface BlogPostListItemDto {
  id: string;
  title: string | null;
  titleFa: string;
  slug: string;
  excerptFa: string | null;
  status: BlogPostStatus;
  effectiveStatus: BlogPostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  coverImage: MediaDto | null;
  categoryIds: string[];
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDto extends BlogPostListItemDto {
  title: string | null;
  excerpt: string | null;
  excerptFa: string | null;
  content: Record<string, unknown>;
  coverImageId: string | null;
  ogImageId: string | null;
  ogImage: MediaDto | null;
  authorAdminId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  canonicalUrl: string | null;
  metaRobots: string;
  faqItems: BlogFaqItem[];
  categories: BlogCategoryDto[];
  tags: BlogTagDto[];
  embeddedProducts: BlogEmbeddedProductDto[];
}

export interface BlogPostSeoInput {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
}

export interface CreateBlogPostInput extends BlogPostSeoInput {
  titleFa: string;
  title?: string | null;
  slug: string;
  excerpt?: string | null;
  excerptFa?: string | null;
  content?: Record<string, unknown>;
  coverImageId?: string | null;
  status?: BlogPostStatus;
  scheduledAt?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  faqItems?: BlogFaqItem[];
}

export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;

export interface PatchBlogPostInput {
  titleFa?: string;
  title?: string | null;
  slug?: string;
  excerpt?: string | null;
  excerptFa?: string | null;
  content?: Record<string, unknown>;
  coverImageId?: string | null;
  status?: BlogPostStatus;
  scheduledAt?: string | null;
  categoryIds?: string[];
  tagIds?: string[];
  faqItems?: BlogFaqItem[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
}
