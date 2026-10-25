import { z } from "zod";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  getSmsProviderById,
  instantiateProvider,
  listSmsProviders,
  mapSmsProvider,
  updateSmsProvider,
} from "@/lib/db/repositories/sms.repository";
import { logSmsMessage } from "@/lib/sms/otp.service";
import { parseSmsirConfig } from "@/lib/sms/providers/smsir/client";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { SmsProviderDto } from "@/types/domain";
import type { SmsProviderCode } from "@/lib/sms/types";

const updateSmsProviderSchema = z.object({
  isActive: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const invokeSchema = z.object({
  action: z.enum([
    "sendVerify",
    "sendBulk",
    "sendLikeToLike",
    "cancelScheduled",
    "getMessageStatus",
    "listTodayPacks",
    "getPackMessages",
    "listLiveMessages",
    "listArchiveMessages",
    "listLatestReceived",
    "listLiveReceived",
    "listArchiveReceived",
    "getCredit",
    "getLines",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function asConfig(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function listSmsProvidersHandler(): Promise<ApiResponse<SmsProviderDto[]>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const rows = await listSmsProviders();
  return { success: true, data: rows.map((row) => mapSmsProvider(row)) };
}

export async function updateSmsProviderHandler(
  ctx: BffContext,
): Promise<ApiResponse<SmsProviderDto>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider id" } };
  }

  const parsed = updateSmsProviderSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const row = await updateSmsProvider(id, parsed.data);
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "SMS provider not found" } };
  }

  return { success: true, data: mapSmsProvider(row) };
}

export async function invokeSmsProviderHandler(
  ctx: BffContext,
): Promise<ApiResponse<unknown>> {
  const auth = await requirePermission("settings.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid provider id" } };
  }

  const parsed = invokeSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const row = await getSmsProviderById(id);
  if (!row) {
    return { success: false, error: { code: "NOT_FOUND", message: "SMS provider not found" } };
  }
  if (!row.is_active) {
    return { success: false, error: { code: "FORBIDDEN", message: "Provider is inactive" } };
  }

  const provider = instantiateProvider(row);
  const config = asConfig(row.config);
  const payload = parsed.data.payload ?? {};
  const code = row.code as SmsProviderCode;

  try {
    switch (parsed.data.action) {
      case "sendVerify": {
        const mobile = String(payload.mobile ?? "");
        const templateId =
          payload.templateId ??
          (code === "smsir" ? parseSmsirConfig(config).verifyTemplateId : "console");
        const parameters = Array.isArray(payload.parameters)
          ? (payload.parameters as Array<{ name: string; value: string }>)
          : [
              {
                name:
                  code === "smsir"
                    ? parseSmsirConfig(config).otpParamName || "CODE"
                    : "CODE",
                value: String(payload.code ?? "123456"),
              },
            ];
        const result = await provider.sendVerify({
          mobile,
          templateId: String(templateId),
          parameters,
        });
        await logSmsMessage({
          providerCode: code,
          channel: "verify",
          mobile,
          externalMessageId: result.messageId ?? null,
          status: result.success ? "submitted" : "failed",
          cost: result.cost ?? null,
          requestPayload: { mobile, templateId, parameters },
          responsePayload: result.raw ?? result,
          errorMessage: result.errorMessage ?? null,
        });
        return { success: true, data: result };
      }
      case "sendBulk": {
        const lineNumber =
          payload.lineNumber ??
          (code === "smsir" ? parseSmsirConfig(config).lineNumber : "console");
        const result = await provider.sendBulk({
          lineNumber: String(lineNumber),
          messageText: String(payload.messageText ?? ""),
          mobiles: Array.isArray(payload.mobiles)
            ? payload.mobiles.map(String)
            : [String(payload.mobile ?? "")].filter(Boolean),
          sendDateTime:
            payload.sendDateTime === null || payload.sendDateTime === undefined
              ? null
              : Number(payload.sendDateTime),
        });
        await logSmsMessage({
          providerCode: code,
          channel: "bulk",
          packId: result.packId ?? null,
          status: result.success ? "submitted" : "failed",
          cost: result.cost ?? null,
          requestPayload: payload,
          responsePayload: result.raw ?? result,
          errorMessage: result.errorMessage ?? null,
        });
        return { success: true, data: result };
      }
      case "sendLikeToLike": {
        const lineNumber =
          payload.lineNumber ??
          (code === "smsir" ? parseSmsirConfig(config).lineNumber : "console");
        const result = await provider.sendLikeToLike({
          lineNumber: String(lineNumber),
          messageTexts: Array.isArray(payload.messageTexts)
            ? payload.messageTexts.map(String)
            : [],
          mobiles: Array.isArray(payload.mobiles) ? payload.mobiles.map(String) : [],
          sendDateTime:
            payload.sendDateTime === null || payload.sendDateTime === undefined
              ? null
              : Number(payload.sendDateTime),
        });
        await logSmsMessage({
          providerCode: code,
          channel: "like_to_like",
          packId: result.packId ?? null,
          status: result.success ? "submitted" : "failed",
          cost: result.cost ?? null,
          requestPayload: payload,
          responsePayload: result.raw ?? result,
          errorMessage: result.errorMessage ?? null,
        });
        return { success: true, data: result };
      }
      case "cancelScheduled": {
        const packId = String(payload.packId ?? "");
        const result = await provider.cancelScheduled(packId);
        return { success: true, data: result };
      }
      case "getMessageStatus": {
        const data = await provider.getMessageStatus(String(payload.messageId ?? ""));
        return { success: true, data };
      }
      case "listTodayPacks": {
        const data = await provider.listTodayPacks({
          pageSize: payload.pageSize != null ? Number(payload.pageSize) : undefined,
          pageNumber: payload.pageNumber != null ? Number(payload.pageNumber) : undefined,
        });
        return { success: true, data };
      }
      case "getPackMessages": {
        const data = await provider.getPackMessages(String(payload.packId ?? ""));
        return { success: true, data };
      }
      case "listLiveMessages": {
        const data = await provider.listLiveMessages({
          pageSize: payload.pageSize != null ? Number(payload.pageSize) : undefined,
          pageNumber: payload.pageNumber != null ? Number(payload.pageNumber) : undefined,
        });
        return { success: true, data };
      }
      case "listArchiveMessages": {
        const data = await provider.listArchiveMessages({
          fromDate: payload.fromDate != null ? Number(payload.fromDate) : undefined,
          toDate: payload.toDate != null ? Number(payload.toDate) : undefined,
          pageSize: payload.pageSize != null ? Number(payload.pageSize) : undefined,
          pageNumber: payload.pageNumber != null ? Number(payload.pageNumber) : undefined,
        });
        return { success: true, data };
      }
      case "listLatestReceived": {
        const data = await provider.listLatestReceived(
          payload.count != null ? Number(payload.count) : 50,
        );
        return { success: true, data };
      }
      case "listLiveReceived": {
        const data = await provider.listLiveReceived({
          pageSize: payload.pageSize != null ? Number(payload.pageSize) : undefined,
          pageNumber: payload.pageNumber != null ? Number(payload.pageNumber) : undefined,
          sortByNewest:
            payload.sortByNewest != null ? Boolean(payload.sortByNewest) : undefined,
        });
        return { success: true, data };
      }
      case "listArchiveReceived": {
        const data = await provider.listArchiveReceived({
          fromDate: payload.fromDate != null ? Number(payload.fromDate) : undefined,
          toDate: payload.toDate != null ? Number(payload.toDate) : undefined,
          pageSize: payload.pageSize != null ? Number(payload.pageSize) : undefined,
          pageNumber: payload.pageNumber != null ? Number(payload.pageNumber) : undefined,
        });
        return { success: true, data };
      }
      case "getCredit": {
        const credit = await provider.getCredit();
        return { success: true, data: { credit } };
      }
      case "getLines": {
        const lines = await provider.getLines();
        return { success: true, data: { lines } };
      }
      default:
        return { success: false, error: { code: "VALIDATION_ERROR", message: "Unknown action" } };
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: "SMS_PROVIDER_ERROR",
        message: error instanceof Error ? error.message : "SMS provider action failed",
      },
    };
  }
}
