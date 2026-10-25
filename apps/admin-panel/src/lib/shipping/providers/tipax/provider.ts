import { getShippingProviderFeatures } from "@/lib/shipping/capabilities";
import {
  parseTipaxConfig,
  tipaxFetch,
  TipaxApiError,
} from "@/lib/shipping/providers/tipax/client";
import {
  ensureTipaxAccessToken,
  obtainTipaxToken,
  refreshTipaxToken,
} from "@/lib/shipping/providers/tipax/token";
import type {
  ShippingAction,
  ShippingInvokeResult,
  ShippingProvider,
  TipaxProviderConfig,
  TokenPersister,
} from "@/lib/shipping/types";

type Route = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string | ((payload: Record<string, unknown>) => string);
  auth?: boolean;
  body?: boolean;
  queryKeys?: string[];
};

const ROUTES: Partial<Record<ShippingAction, Route>> = {
  tokenWithPhone: {
    method: "POST",
    path: "/api/OM/v3/Account/tokenwithphonenumber",
    auth: false,
    body: true,
  },
  listStates: { method: "GET", path: "/api/OM/v3/States", auth: true },
  listCities: { method: "GET", path: "/api/OM/v3/Cities", auth: true },
  listCitiesWithState: { method: "GET", path: "/api/OM/v3/Cities/plusstate", auth: true },
  listBranchCities: { method: "GET", path: "/api/OM/v3/Cities/BranchCities", auth: true },
  listBusinessAddresses: { method: "GET", path: "/api/OM/v3/Addresses", auth: true },
  createBusinessAddress: { method: "POST", path: "/api/OM/v3/Addresses", auth: true, body: true },
  getAddress: {
    method: "GET",
    path: (p) => `/api/OM/v3/Addresses/${p.id}`,
    auth: true,
  },
  listAddressBook: { method: "GET", path: "/api/OM/v3/Addresses/Book", auth: true },
  addAddressBook: { method: "POST", path: "/api/OM/v3/Addresses/Book", auth: true, body: true },
  getCurrentCustomer: { method: "GET", path: "/api/OM/v3/Customers", auth: true },
  getCredit: { method: "GET", path: "/api/OM/v3/Customers/Credit", auth: true },
  getWallet: { method: "GET", path: "/api/OM/v3/Customers/Wallet", auth: true },
  rechargeWallet: {
    method: "POST",
    path: "/api/OM/v3/Customers/RechargeWallet",
    auth: true,
    body: true,
  },
  getRemain: { method: "GET", path: "/api/OM/v3/Customers/Remain", auth: true },
  listMyCustomers: { method: "GET", path: "/api/OM/v3/Customers/mycustomers", auth: true },
  getMyCustomer: {
    method: "GET",
    path: (p) => `/api/OM/v3/Customers/mycustomers/${p.id}`,
    auth: true,
  },
  listMyProducts: { method: "GET", path: "/api/OM/v3/Customers/myproducts", auth: true },
  listMySubstations: { method: "GET", path: "/api/OM/v3/Customers/mySubstations", auth: true },
  createMySubstation: {
    method: "POST",
    path: "/api/OM/v3/Customers/CreateMySubstation",
    auth: true,
    body: true,
  },
  disableMySubstation: {
    method: "POST",
    path: "/api/OM/v3/Customers/DisableMySubstation",
    auth: true,
    body: true,
  },
  enableMySubstation: {
    method: "POST",
    path: "/api/OM/v3/Customers/EnableMySubstation",
    auth: true,
    body: true,
  },
  createOrder: { method: "POST", path: "/api/OM/v3/Orders", auth: true, body: true },
  createOrderWithPreDefinedOrigin: {
    method: "POST",
    path: "/api/OM/v3/Orders/WithPreDefinedOrigin",
    auth: true,
    body: true,
  },
  createOrderWithPreDefinedAddresses: {
    method: "POST",
    path: "/api/OM/v3/Orders/WithPreDefinedAddresses",
    auth: true,
    body: true,
  },
  createOrderWithCoordinates: {
    method: "POST",
    path: "/api/OM/v3/Orders/WithCoordinates",
    auth: true,
    body: true,
  },
  createOrderWithDiscount: {
    method: "POST",
    path: "/api/OM/v3/Orders/WithDiscount",
    auth: true,
    body: true,
  },
  createPluginOrder: {
    method: "POST",
    path: "/api/OM/v3/Orders/PluginOrder",
    auth: true,
    body: true,
  },
  createMyTipaxOrder: {
    method: "POST",
    path: "/api/OM/v3/Orders/MyTipaxOrder",
    auth: true,
    body: true,
  },
  createPreOrder: { method: "POST", path: "/api/OM/v3/Orders/PreOrder", auth: true, body: true },
  createQueueOrder: {
    method: "POST",
    path: "/api/OM/v3/Orders/QueueOrder",
    auth: true,
    body: true,
  },
  createBulkQueueOrder: {
    method: "POST",
    path: "/api/OM/v3/Orders/BulkQueueOrder",
    auth: true,
    body: true,
  },
  createGroupOrder: {
    method: "POST",
    path: "/api/OM/v3/Orders/GroupOrder",
    auth: true,
    body: true,
  },
  createOrderForAnotherCustomer: {
    method: "POST",
    path: "/api/OM/v3/Orders/OrderForAnotherCustomer",
    auth: true,
    body: true,
  },
  cancelOrder: {
    method: "POST",
    path: (p) => `/api/OM/v3/Orders/CancelOrder/${p.orderId}`,
    auth: true,
  },
  cancelOrderByCode: {
    method: "POST",
    path: (p) => `/api/OM/v3/Orders/CancelOrderByCode/${p.secondaryTraceCode}`,
    auth: true,
  },
  getOrderAmount: {
    method: "GET",
    path: (p) => `/api/OM/v3/Orders/GetOrderAmountByOrderId/${p.orderId}`,
    auth: true,
  },
  getSumOrderAmounts: {
    method: "POST",
    path: "/api/OM/v3/Orders/GetSumTotalAmountByOrderIds",
    auth: true,
    body: true,
  },
  price: { method: "POST", path: "/api/OM/v3/Pricing", auth: true, body: true },
  priceWithAddressId: {
    method: "POST",
    path: "/api/OM/v3/Pricing/WithAddressId",
    auth: true,
    body: true,
  },
  priceWithOriginAddressId: {
    method: "POST",
    path: "/api/OM/v3/Pricing/WithOriginAddressId",
    auth: true,
    body: true,
  },
  priceForAllServices: {
    method: "POST",
    path: "/api/OM/v3/Pricing/GetForAllServices",
    auth: true,
    body: true,
  },
  priceWithAddressIdForAllServices: {
    method: "POST",
    path: "/api/OM/v3/Pricing/WithAddressIdForAllServices",
    auth: true,
    body: true,
  },
  priceWithOriginAddressIdForAllServices: {
    method: "POST",
    path: "/api/OM/v3/Pricing/WithOriginAddressIdForAllServices",
    auth: true,
    body: true,
  },
  getServicesBetweenCities: {
    method: "POST",
    path: "/api/OM/v3/Pricing/GetServicesBetweenCities",
    auth: true,
    body: true,
  },
  listPackContentRates: { method: "GET", path: "/api/OM/v3/PackContentRates", auth: true },
  listPackingPrices: { method: "GET", path: "/api/OM/v3/PackingPrices", auth: true },
  listParcelBooks: { method: "GET", path: "/api/OM/v3/ParcelBooks", auth: true },
  createParcelBook: { method: "POST", path: "/api/OM/v3/ParcelBooks", auth: true, body: true },
  searchParcelTypes: {
    method: "POST",
    path: "/api/OM/v3/ParcelType/Search",
    auth: true,
    body: true,
  },
  getParcelType: {
    method: "GET",
    path: "/api/OM/v3/ParcelType/Get",
    auth: true,
    queryKeys: ["id"],
  },
  searchPaymentTypes: {
    method: "POST",
    path: "/api/OM/v3/PaymentType/Search",
    auth: true,
    body: true,
  },
  getPaymentType: {
    method: "GET",
    path: "/api/OM/v3/PaymentType/Get",
    auth: true,
    queryKeys: ["id"],
  },
  listParcelStatuses: { method: "GET", path: "/api/OM/v3/ParcelStatus", auth: true },
  listParcelStatusEvents: {
    method: "GET",
    path: "/api/OM/v3/ParcelStatus/GetEventWithStatus",
    auth: true,
  },
  getParcelsByOrderId: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/GetByOrderId/${p.orderId}`,
    auth: true,
  },
  cancelParcel: {
    method: "PUT",
    path: (p) => `/api/OM/v3/Parcels/Cancel/${p.trackingCode}`,
    auth: true,
  },
  getParcelPaymentType: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/PaymentType/${p.trackingCode}`,
    auth: true,
  },
  getParcelAmount: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/GetAmountByTrackingCode/${p.trackingCode}`,
    auth: true,
  },
  getParcelAmountByContract: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/GetAmountByContractCode/${p.contractCode}`,
    auth: true,
  },
  getParcelPriceDetail: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/GetPriceDetailByTrackingCode/${p.trackingCode}`,
    auth: true,
  },
  getParcelPriceDetailByContract: {
    method: "GET",
    path: (p) => `/api/OM/v3/Parcels/GetPriceDetailByContractCode/${p.contractCode}`,
    auth: true,
  },
  sumParcelAmounts: {
    method: "POST",
    path: "/api/OM/v3/Parcels/GetSumTotalAmountByTrackingCodes",
    auth: true,
    body: true,
  },
  searchParcels: { method: "POST", path: "/api/OM/v3/Parcels/Search", auth: true, body: true },
  trackBrief: {
    method: "GET",
    path: (p) => `/api/OM/v3/Tracking/BriefTracking/${p.trackingInput ?? p.trackingCode}`,
    auth: true,
  },
  trackByContract: {
    method: "GET",
    path: (p) => `/api/OM/v3/Tracking/ByContractCode/${p.contractCode}`,
    auth: true,
  },
  trackByOrderId: {
    method: "GET",
    path: (p) => `/api/OM/v3/Tracking/${p.orderId}`,
    auth: true,
  },
  trackByTrackingCodes: {
    method: "POST",
    path: "/api/OM/v3/Tracking/ByTrackingCode",
    auth: true,
    body: true,
  },
  trackByTraceCode: {
    method: "POST",
    path: (p) => `/api/OM/v3/Tracking/${p.traceCode}`,
    auth: true,
    body: true,
  },
  trackBySecondaryTraceCode: {
    method: "POST",
    path: (p) => `/api/OM/v3/Tracking/BySecondaryTraceCode/${p.secondaryTraceCode}`,
    auth: true,
    body: true,
  },
  listFinancialDocuments: {
    method: "GET",
    path: "/api/OM/v3/Financial/GetDocuments",
    auth: true,
  },
  listFinancialDocumentsByYear: {
    method: "GET",
    path: "/api/OM/v3/Financial/GetDocumentsByYear",
    auth: true,
    queryKeys: ["year"],
  },
  getFinancialDocument: {
    method: "GET",
    path: "/api/OM/v3/Financial/GetDocumentById",
    auth: true,
    queryKeys: ["id"],
  },
  listTickets: { method: "GET", path: "/api/OM/v3/Ticketing", auth: true },
  createTicket: { method: "POST", path: "/api/OM/v3/Ticketing", auth: true, body: true },
  answerTicket: { method: "POST", path: "/api/OM/v3/Ticketing/Answer", auth: true, body: true },
  getTicket: {
    method: "GET",
    path: (p) => `/api/OM/v3/Ticketing/${p.id}`,
    auth: true,
  },
  getTicketsByOrderId: {
    method: "GET",
    path: (p) => `/api/OM/v3/Ticketing/GetByOrderId/${p.orderId}`,
    auth: true,
  },
  listTicketDepartments: {
    method: "GET",
    path: "/api/OM/v3/Ticketing/GetDepartments",
    auth: true,
  },
  listWebhooks: { method: "GET", path: "/api/OM/v3/CustomerWebhook", auth: true },
  createWebhook: { method: "POST", path: "/api/OM/v3/CustomerWebhook", auth: true, body: true },
  updateWebhook: { method: "PUT", path: "/api/OM/v3/CustomerWebhook", auth: true, body: true },
  softDeleteWebhook: {
    method: "PUT",
    path: (p) => `/api/OM/v3/CustomerWebhook/SoftDelete/${p.id}`,
    auth: true,
  },
  listWebhookHistory: {
    method: "POST",
    path: "/api/OM/v3/CustomerWebhookHistory/GetAll",
    auth: true,
    body: true,
  },
  recentWebhookHistory: {
    method: "GET",
    path: (p) => `/api/OM/v3/CustomerWebhookHistory/Recent/${p.customerId}`,
    auth: true,
  },
  searchLockerKiosks: {
    method: "POST",
    path: "/api/v3/Locker/SearchKiosks",
    auth: true,
    body: true,
  },
  searchLockerBunches: {
    method: "POST",
    path: "/api/v3/Locker/SearchBunches",
    auth: true,
    body: true,
  },
  getNextDayTimeTable: {
    method: "GET",
    path: "/api/v3/TimeTable/GetNextDayTimeTableSchedule",
    auth: true,
  },
};

function fail(error: unknown): ShippingInvokeResult {
  if (error instanceof TipaxApiError) {
    return { success: false, errorCode: error.status, errorMessage: error.message, data: error.raw };
  }
  return {
    success: false,
    errorMessage: error instanceof Error ? error.message : "Unknown Tipax error",
  };
}

export function createTipaxProvider(
  rawConfig: Record<string, unknown>,
  persistTokens?: TokenPersister,
): ShippingProvider {
  let config = parseTipaxConfig(rawConfig);

  async function withAuth<T>(fn: (cfg: TipaxProviderConfig) => Promise<T>): Promise<T> {
    config = await ensureTipaxAccessToken(
      { ...config },
      persistTokens
        ? async (tokens) => {
            config = { ...config, ...tokens };
            await persistTokens(tokens);
          }
        : undefined,
    );

    try {
      return await fn(config);
    } catch (error) {
      if (error instanceof TipaxApiError && error.status === 401) {
        config = await refreshTipaxToken(
          config,
          persistTokens
            ? async (tokens) => {
                config = { ...config, ...tokens };
                await persistTokens(tokens);
              }
            : undefined,
        );
        return fn(config);
      }
      throw error;
    }
  }

  return {
    code: "tipax",
    name: "Tipax (ای‌تیپاکس)",
    features: getShippingProviderFeatures("tipax"),

    async invoke(action, payload = {}): Promise<ShippingInvokeResult> {
      try {
        if (action === "obtainToken") {
          config = await obtainTipaxToken(
            parseTipaxConfig({ ...config, ...payload }),
            persistTokens
              ? async (tokens) => {
                  config = { ...config, ...tokens };
                  await persistTokens(tokens);
                }
              : undefined,
          );
          return {
            success: true,
            data: {
              tokenSet: true,
              expiresAt: config.expiresAt,
              hasRefreshToken: Boolean(config.refreshToken),
            },
          };
        }

        if (action === "refreshToken") {
          config = await refreshTipaxToken(
            config,
            persistTokens
              ? async (tokens) => {
                  config = { ...config, ...tokens };
                  await persistTokens(tokens);
                }
              : undefined,
          );
          return {
            success: true,
            data: {
              tokenSet: true,
              expiresAt: config.expiresAt,
              hasRefreshToken: Boolean(config.refreshToken),
            },
          };
        }

        const route = ROUTES[action];
        if (!route) {
          return { success: false, errorMessage: `Unsupported Tipax action: ${action}` };
        }

        const path = typeof route.path === "function" ? route.path(payload) : route.path;
        const query: Record<string, string | number | boolean | undefined | null> = {};
        for (const key of route.queryKeys ?? []) {
          query[key] = payload[key] as string | number | boolean | undefined | null;
        }

        const run = async (cfg: TipaxProviderConfig) =>
          tipaxFetch({
            baseUrl: cfg.baseUrl,
            method: route.method,
            path,
            body: route.body ? payload : undefined,
            accessToken: route.auth === false ? undefined : cfg.accessToken,
            query,
          });

        const data =
          route.auth === false
            ? await run(config)
            : await withAuth(run);

        return { success: true, data };
      } catch (error) {
        return fail(error);
      }
    },
  };
}
