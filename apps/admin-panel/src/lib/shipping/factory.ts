import { createManualShippingProvider } from "@/lib/shipping/providers/manual.provider";
import { createTipaxProvider } from "@/lib/shipping/providers/tipax/provider";
import type { ShippingProvider, ShippingProviderCode, TokenPersister } from "@/lib/shipping/types";

export function createShippingProvider(
  code: ShippingProviderCode,
  config: Record<string, unknown> = {},
  persistTokens?: TokenPersister,
): ShippingProvider {
  switch (code) {
    case "tipax":
      return createTipaxProvider(config, persistTokens);
    case "manual":
      return createManualShippingProvider();
    default: {
      const exhaustive: never = code;
      throw new Error(`Unsupported shipping provider: ${String(exhaustive)}`);
    }
  }
}
