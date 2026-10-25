import { getShippingProviderFeatures } from "@/lib/shipping/capabilities";
import type {
  ShippingAction,
  ShippingInvokeResult,
  ShippingProvider,
} from "@/lib/shipping/types";

let seq = 1;

function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export function createManualShippingProvider(): ShippingProvider {
  return {
    code: "manual",
    name: "Manual / Internal",
    features: getShippingProviderFeatures("manual"),

    async invoke(action: ShippingAction, payload: Record<string, unknown> = {}): Promise<ShippingInvokeResult> {
      switch (action) {
        case "obtainToken":
        case "refreshToken":
          return { success: true, data: { tokenSet: false, manual: true } };
        case "price":
        case "priceForAllServices":
        case "getServicesBetweenCities":
          return {
            success: true,
            data: {
              provider: "manual",
              amount: 0,
              currency: "IRR",
              note: "قیمت‌گذاری دستی — بدون فراخوانی API",
              payload,
            },
          };
        case "createOrder":
        case "createOrderWithCoordinates":
        case "createPreOrder":
        case "createQueueOrder": {
          const trackingCode = nextId("MANUAL");
          return {
            success: true,
            data: {
              provider: "manual",
              orderId: nextId("order"),
              trackingCode,
              status: "registered",
              payload,
            },
          };
        }
        case "trackBrief":
        case "trackByOrderId":
        case "trackByTraceCode":
          return {
            success: true,
            data: {
              provider: "manual",
              status: "processing",
              trackingInput: payload.trackingInput ?? payload.trackingCode ?? payload.orderId,
            },
          };
        case "cancelOrder":
        case "cancelParcel":
          return { success: true, data: { provider: "manual", cancelled: true, payload } };
        case "listCities":
        case "listCitiesWithState":
        case "listStates":
          return { success: true, data: [] };
        default:
          return {
            success: false,
            errorMessage: `Manual provider does not support action: ${action}`,
          };
      }
    },
  };
}
