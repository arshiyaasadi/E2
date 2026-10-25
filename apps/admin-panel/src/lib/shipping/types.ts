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

export interface ShippingFeatureMeta {
  id: ShippingFeatureId;
  supported: boolean;
}

export type ShippingAction =
  | "obtainToken"
  | "refreshToken"
  | "tokenWithPhone"
  | "listStates"
  | "listCities"
  | "listCitiesWithState"
  | "listBranchCities"
  | "listBusinessAddresses"
  | "createBusinessAddress"
  | "getAddress"
  | "listAddressBook"
  | "addAddressBook"
  | "getCurrentCustomer"
  | "getCredit"
  | "getWallet"
  | "rechargeWallet"
  | "getRemain"
  | "listMyCustomers"
  | "getMyCustomer"
  | "listMyProducts"
  | "listMySubstations"
  | "createMySubstation"
  | "disableMySubstation"
  | "enableMySubstation"
  | "createOrder"
  | "createOrderWithPreDefinedOrigin"
  | "createOrderWithPreDefinedAddresses"
  | "createOrderWithCoordinates"
  | "createOrderWithDiscount"
  | "createPluginOrder"
  | "createMyTipaxOrder"
  | "createPreOrder"
  | "createQueueOrder"
  | "createBulkQueueOrder"
  | "createGroupOrder"
  | "createOrderForAnotherCustomer"
  | "cancelOrder"
  | "cancelOrderByCode"
  | "getOrderAmount"
  | "getSumOrderAmounts"
  | "price"
  | "priceWithAddressId"
  | "priceWithOriginAddressId"
  | "priceForAllServices"
  | "priceWithAddressIdForAllServices"
  | "priceWithOriginAddressIdForAllServices"
  | "getServicesBetweenCities"
  | "listPackContentRates"
  | "listPackingPrices"
  | "listParcelBooks"
  | "createParcelBook"
  | "searchParcelTypes"
  | "getParcelType"
  | "searchPaymentTypes"
  | "getPaymentType"
  | "listParcelStatuses"
  | "listParcelStatusEvents"
  | "getParcelsByOrderId"
  | "cancelParcel"
  | "getParcelPaymentType"
  | "getParcelAmount"
  | "getParcelAmountByContract"
  | "getParcelPriceDetail"
  | "getParcelPriceDetailByContract"
  | "sumParcelAmounts"
  | "searchParcels"
  | "trackBrief"
  | "trackByContract"
  | "trackByOrderId"
  | "trackByTrackingCodes"
  | "trackByTraceCode"
  | "trackBySecondaryTraceCode"
  | "listFinancialDocuments"
  | "listFinancialDocumentsByYear"
  | "getFinancialDocument"
  | "listTickets"
  | "createTicket"
  | "answerTicket"
  | "getTicket"
  | "getTicketsByOrderId"
  | "listTicketDepartments"
  | "listWebhooks"
  | "createWebhook"
  | "updateWebhook"
  | "softDeleteWebhook"
  | "listWebhookHistory"
  | "recentWebhookHistory"
  | "searchLockerKiosks"
  | "searchLockerBunches"
  | "getNextDayTimeTable";

export interface ShippingInvokeResult {
  success: boolean;
  data?: unknown;
  errorMessage?: string;
  errorCode?: string | number;
}

export interface TipaxProviderConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  defaultOriginAddressId: number | null;
  defaultPaymentType: number;
  defaultPickupType: number;
  defaultDistributionType: number;
  defaultServiceId: number;
}

export type TokenPersister = (tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
}) => Promise<void>;

export interface ShippingProvider {
  readonly code: ShippingProviderCode;
  readonly name: string;
  readonly features: ShippingFeatureMeta[];
  invoke(action: ShippingAction, payload?: Record<string, unknown>): Promise<ShippingInvokeResult>;
}
