import { createConsoleProvider } from "@/lib/sms/providers/console.provider";
import { createSmsirProvider } from "@/lib/sms/providers/smsir/provider";
import type { SmsProvider, SmsProviderCode } from "@/lib/sms/types";

export function createSmsProvider(
  code: SmsProviderCode,
  config: Record<string, unknown> = {},
): SmsProvider {
  switch (code) {
    case "smsir":
      return createSmsirProvider(config);
    case "console":
      return createConsoleProvider(config);
    default: {
      const exhaustive: never = code;
      throw new Error(`Unsupported SMS provider: ${String(exhaustive)}`);
    }
  }
}
