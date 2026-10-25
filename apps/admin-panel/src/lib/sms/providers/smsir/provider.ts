import { getProviderFeatures } from "@/lib/sms/capabilities";
import {
  normalizeSmsirMobile,
  parseSmsirConfig,
  smsirRequest,
  SmsirApiError,
} from "@/lib/sms/providers/smsir/client";
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

function fail(error: unknown): SmsSendResult {
  if (error instanceof SmsirApiError) {
    return {
      success: false,
      errorCode: error.status,
      errorMessage: error.message,
      raw: error.raw,
    };
  }
  return {
    success: false,
    errorMessage: error instanceof Error ? error.message : "Unknown SMS.ir error",
  };
}

function mapDelivery(row: Record<string, unknown>): SmsDeliveryStatus {
  return {
    messageId: String(row.messageId ?? row.MessageId ?? ""),
    mobile: row.mobile != null ? String(row.mobile) : undefined,
    messageText: row.messageText != null ? String(row.messageText) : undefined,
    sendDateTime: typeof row.sendDateTime === "number" ? row.sendDateTime : undefined,
    lineNumber: row.lineNumber != null ? String(row.lineNumber) : undefined,
    cost: typeof row.cost === "number" ? row.cost : undefined,
    deliveryState:
      row.deliveryState === null || row.deliveryState === undefined
        ? null
        : Number(row.deliveryState),
    deliveryDateTime:
      row.deliveryDateTime === null || row.deliveryDateTime === undefined
        ? null
        : Number(row.deliveryDateTime),
    raw: row,
  };
}

function mapReceived(row: Record<string, unknown>): SmsReceivedMessage {
  return {
    receiveReturnId:
      row.receiveReturnId != null ? String(row.receiveReturnId) : undefined,
    mobile: String(row.mobile ?? ""),
    messageText: String(row.messageText ?? ""),
    number: row.number != null ? String(row.number) : undefined,
    receivedDateTime: Number(row.receivedDateTime ?? 0),
  };
}

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function createSmsirProvider(rawConfig: Record<string, unknown>): SmsProvider {
  const config = parseSmsirConfig(rawConfig);

  return {
    code: "smsir",
    name: "SMS.ir",
    features: getProviderFeatures("smsir"),

    async sendVerify(input: SmsVerifyInput): Promise<SmsSendResult> {
      try {
        const data = await smsirRequest<{ messageId: number; cost: number }>(
          config.apiKey,
          "POST",
          "/send/verify",
          {
            mobile: normalizeSmsirMobile(input.mobile),
            templateId: Number(input.templateId),
            parameters: input.parameters,
          },
        );
        return {
          success: true,
          messageId: String(data.data.messageId),
          cost: data.data.cost,
          raw: data,
        };
      } catch (error) {
        return fail(error);
      }
    },

    async sendBulk(input: SmsBulkInput): Promise<SmsSendResult> {
      try {
        const data = await smsirRequest<{
          packId: string;
          messageIds: Array<number | null>;
          cost: number;
        }>(config.apiKey, "POST", "/send/bulk", {
          lineNumber: Number(input.lineNumber),
          messageText: input.messageText,
          mobiles: input.mobiles.map(normalizeSmsirMobile),
          sendDateTime: input.sendDateTime ?? null,
        });
        return {
          success: true,
          packId: data.data.packId,
          messageIds: data.data.messageIds.map((id) => (id == null ? null : String(id))),
          cost: data.data.cost,
          raw: data,
        };
      } catch (error) {
        return fail(error);
      }
    },

    async sendLikeToLike(input: SmsLikeToLikeInput): Promise<SmsSendResult> {
      try {
        const data = await smsirRequest<{
          packId: string;
          messageIds: Array<number | null>;
          cost: number;
        }>(config.apiKey, "POST", "/send/likeToLike", {
          lineNumber: Number(input.lineNumber),
          messageTexts: input.messageTexts,
          mobiles: input.mobiles.map(normalizeSmsirMobile),
          sendDateTime: input.sendDateTime ?? null,
        });
        return {
          success: true,
          packId: data.data.packId,
          messageIds: data.data.messageIds.map((id) => (id == null ? null : String(id))),
          cost: data.data.cost,
          raw: data,
        };
      } catch (error) {
        return fail(error);
      }
    },

    async cancelScheduled(packId: string): Promise<SmsSendResult> {
      try {
        const data = await smsirRequest<{
          returnedCreditCount: number;
          smsCount: number;
        }>(config.apiKey, "DELETE", `/send/scheduled/${packId}`);
        return {
          success: true,
          packId,
          cost: data.data.returnedCreditCount,
          raw: data,
        };
      } catch (error) {
        return fail(error);
      }
    },

    async getMessageStatus(messageId: string): Promise<SmsDeliveryStatus> {
      const data = await smsirRequest<Record<string, unknown>>(
        config.apiKey,
        "GET",
        `/send/${messageId}`,
      );
      return mapDelivery(data.data);
    },

    async listTodayPacks(query?: SmsLiveQuery): Promise<SmsPackSummary[]> {
      const qs = buildQuery({
        pageSize: query?.pageSize,
        pageNumber: query?.pageNumber,
      });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/send/pack${qs}`,
      );
      return (data.data ?? []).map((row) => ({
        packId: String(row.packId ?? ""),
        recipientCount: Number(row.recipientCount ?? 0),
        creationDateTime: Number(row.creationDateTime ?? 0),
      }));
    },

    async getPackMessages(packId: string): Promise<SmsDeliveryStatus[]> {
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/send/pack/${packId}`,
      );
      return (data.data ?? []).map(mapDelivery);
    },

    async listLiveMessages(query?: SmsLiveQuery): Promise<SmsDeliveryStatus[]> {
      const qs = buildQuery({
        pageSize: query?.pageSize,
        pageNumber: query?.pageNumber,
      });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/send/live${qs}`,
      );
      return (data.data ?? []).map(mapDelivery);
    },

    async listArchiveMessages(query?: SmsArchiveQuery): Promise<SmsDeliveryStatus[]> {
      const qs = buildQuery({
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        pageSize: query?.pageSize,
        pageNumber: query?.pageNumber,
      });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/send/archive${qs}`,
      );
      return (data.data ?? []).map(mapDelivery);
    },

    async listLatestReceived(count = 50): Promise<SmsReceivedMessage[]> {
      const qs = buildQuery({ count });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/receive/latest${qs}`,
      );
      return (data.data ?? []).map(mapReceived);
    },

    async listLiveReceived(query?: SmsLiveQuery): Promise<SmsReceivedMessage[]> {
      const qs = buildQuery({
        pageSize: query?.pageSize,
        pageNumber: query?.pageNumber,
        sortByNewest: query?.sortByNewest,
      });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/receive/live${qs}`,
      );
      return (data.data ?? []).map(mapReceived);
    },

    async listArchiveReceived(query?: SmsArchiveQuery): Promise<SmsReceivedMessage[]> {
      const qs = buildQuery({
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        pageSize: query?.pageSize,
        pageNumber: query?.pageNumber,
      });
      const data = await smsirRequest<Array<Record<string, unknown>>>(
        config.apiKey,
        "GET",
        `/receive/archive${qs}`,
      );
      return (data.data ?? []).map(mapReceived);
    },

    async getCredit(): Promise<number> {
      const data = await smsirRequest<number>(config.apiKey, "GET", "/credit");
      return Number(data.data);
    },

    async getLines(): Promise<string[]> {
      const data = await smsirRequest<Array<number | string>>(config.apiKey, "GET", "/line");
      return (data.data ?? []).map(String);
    },
  };
}
