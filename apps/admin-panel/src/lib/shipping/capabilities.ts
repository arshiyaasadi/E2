import type { ShippingFeatureId, ShippingFeatureMeta, ShippingProviderCode } from "@/lib/shipping/types";

const ALL: ShippingFeatureId[] = [
  "auth",
  "addresses",
  "cities",
  "customers",
  "orders",
  "pricing",
  "parcels",
  "tracking",
  "financial",
  "ticketing",
  "webhooks",
  "locker",
];

function features(supported: ShippingFeatureId[]): ShippingFeatureMeta[] {
  const set = new Set(supported);
  return ALL.map((id) => ({ id, supported: set.has(id) }));
}

export const SHIPPING_PROVIDER_FEATURES: Record<ShippingProviderCode, ShippingFeatureMeta[]> = {
  tipax: features(ALL),
  manual: features(["orders", "tracking", "pricing"]),
};

export function getShippingProviderFeatures(code: ShippingProviderCode): ShippingFeatureMeta[] {
  return SHIPPING_PROVIDER_FEATURES[code] ?? features([]);
}
