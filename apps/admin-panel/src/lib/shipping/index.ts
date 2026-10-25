export type {
  ShippingProvider,
  ShippingProviderCode,
  ShippingFeatureId,
  ShippingFeatureMeta,
  ShippingAction,
  ShippingInvokeResult,
  TipaxProviderConfig,
} from "@/lib/shipping/types";
export { getShippingProviderFeatures, SHIPPING_PROVIDER_FEATURES } from "@/lib/shipping/capabilities";
export { createShippingProvider } from "@/lib/shipping/factory";
