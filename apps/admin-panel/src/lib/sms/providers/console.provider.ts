import { getProviderFeatures } from "@/lib/sms/capabilities";
import type {
  SmsArchiveQuery,
  SmsBulkInput,
  SmsDeliveryStatus,
  SmsLikeToLikeInput,
  SmsLiveQuery,
  SmsPackSummary,
  SmsProvider,
  SmsReceivedMessage,
  SmsSendResult,
  SmsVerifyInput,
} from "@/lib/sms/types";

let consoleSeq = 1;

function nextId(prefix: string) {
  consoleSeq += 1;
  return `${prefix}-${Date.now()}-${consoleSeq}`;
}

function unsupported(feature: string): never {
  throw new Error(`Console provider does not support ${feature}`);
}

export function createConsoleProvider(rawConfig: Record<string, unknown> = {}): SmsProvider {
  const logOtp = rawConfig.logOtp !== false;

  return {
    code: "console",
    name: "Console (Development)",
    features: getProviderFeatures("console"),

    async sendVerify(input: SmsVerifyInput): Promise<SmsSendResult> {
      const messageId = nextId("console-verify");
      if (logOtp) {
        console.info("[sms:console:verify]", {
          mobile: input.mobile,
          templateId: input.templateId,
          parameters: input.parameters,
          messageId,
        });
      }
      return { success: true, messageId, cost: 0 };
    },

    async sendBulk(input: SmsBulkInput): Promise<SmsSendResult> {
      const packId = nextId("console-pack");
      const messageIds = input.mobiles.map(() => nextId("console-msg"));
      console.info("[sms:console:bulk]", { ...input, packId, messageIds });
      return { success: true, packId, messageIds, cost: 0 };
    },

    async sendLikeToLike(input: SmsLikeToLikeInput): Promise<SmsSendResult> {
      const packId = nextId("console-pack");
      const messageIds = input.mobiles.map(() => nextId("console-msg"));
      console.info("[sms:console:likeToLike]", { ...input, packId, messageIds });
      return { success: true, packId, messageIds, cost: 0 };
    },

    async cancelScheduled(): Promise<SmsSendResult> {
      return { success: false, errorMessage: "Console provider does not support scheduled sends" };
    },

    async getMessageStatus(messageId: string): Promise<SmsDeliveryStatus> {
      return {
        messageId,
        deliveryState: 1,
        messageText: "console-simulated",
      };
    },

    async listTodayPacks(): Promise<SmsPackSummary[]> {
      return [];
    },

    async getPackMessages(): Promise<SmsDeliveryStatus[]> {
      return [];
    },

    async listLiveMessages(): Promise<SmsDeliveryStatus[]> {
      return [];
    },

    async listArchiveMessages(_query?: SmsArchiveQuery): Promise<SmsDeliveryStatus[]> {
      return [];
    },

    async listLatestReceived(): Promise<SmsReceivedMessage[]> {
      unsupported("receive");
    },

    async listLiveReceived(_query?: SmsLiveQuery): Promise<SmsReceivedMessage[]> {
      unsupported("receive");
    },

    async listArchiveReceived(_query?: SmsArchiveQuery): Promise<SmsReceivedMessage[]> {
      unsupported("receive");
    },

    async getCredit(): Promise<number> {
      return Number.POSITIVE_INFINITY;
    },

    async getLines(): Promise<string[]> {
      return ["console"];
    },
  };
}
