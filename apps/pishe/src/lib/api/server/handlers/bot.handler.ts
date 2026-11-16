import { z } from "zod";
import {
  bindTelegramChat,
  getActiveBindingByChat,
  recordTelegramIngest,
  reserveQuota,
  verifyTelegramCode,
} from "@/lib/db/spaces";
import type { ApiResponse } from "@/types/api";

function unauthorized(): ApiResponse<never> {
  return {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Invalid service token" },
  };
}

function validation(message: string): ApiResponse<never> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

function conflict(message: string): ApiResponse<never> {
  return { success: false, error: { code: "CONFLICT", message } };
}

function notFound(message: string): ApiResponse<never> {
  return { success: false, error: { code: "NOT_FOUND", message } };
}

function forbidden(message: string): ApiResponse<never> {
  return { success: false, error: { code: "FORBIDDEN", message } };
}

export function assertBotServiceToken(authHeader?: string | null): boolean {
  const expected = process.env.TELEGRAM_BOT_SERVICE_TOKEN;
  if (!expected || !authHeader) return false;
  return authHeader === `Bearer ${expected}`;
}

const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
  telegramUserId: z.string().trim().min(1).max(64),
});

const bindSchema = z.object({
  telegramUserId: z.string().trim().min(1).max(64),
  chatId: z.string().trim().min(1).max(64),
  title: z.string().trim().max(256).nullable().optional(),
});

const reserveSchema = z.object({
  businessId: z.string().trim().min(1),
  sizeBytes: z.union([z.string(), z.number()]).transform((v, ctx) => {
    try {
      const n = typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(v);
      if (n < BigInt(0)) {
        ctx.addIssue({ code: "custom", message: "sizeBytes must be >= 0" });
        return z.NEVER;
      }
      return n;
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid sizeBytes" });
      return z.NEVER;
    }
  }),
});

const ingestSchema = z.object({
  businessId: z.string().trim().min(1),
  path: z.string().trim().min(1).max(1024),
  mime: z.string().trim().max(256).nullable().optional(),
  sizeBytes: z.union([z.string(), z.number()]).transform((v, ctx) => {
    try {
      return typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid sizeBytes" });
      return z.NEVER;
    }
  }),
  telegramMessageId: z.string().trim().max(64).nullable().optional(),
  telegramChatId: z.string().trim().max(64).nullable().optional(),
  createdByProfileId: z.string().trim().max(64).nullable().optional(),
});

export async function botVerifyCodeHandler(
  body: unknown,
  authHeader?: string | null,
): Promise<ApiResponse<unknown>> {
  if (!assertBotServiceToken(authHeader)) return unauthorized();

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await verifyTelegramCode(parsed.data);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return notFound("Business code not found");
    if (result.reason === "NOT_PENDING") {
      return conflict("Start registration from Pishe first (PENDING required)");
    }
    return forbidden("Registrant is not a business member");
  }

  return {
    success: true,
    data: {
      business: result.business,
      binding: result.binding,
    },
  };
}

export async function botBindChatHandler(
  body: unknown,
  authHeader?: string | null,
): Promise<ApiResponse<unknown>> {
  if (!assertBotServiceToken(authHeader)) return unauthorized();

  const parsed = bindSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await bindTelegramChat(parsed.data);
  if (!result.ok) {
    if (result.reason === "CHAT_TAKEN") {
      return conflict("This Telegram group is already bound to another business");
    }
    return notFound("No PENDING registration for this Telegram user");
  }

  return {
    success: true,
    data: { business: result.business, binding: result.binding },
  };
}

export async function botGetBindingHandler(
  searchParams?: URLSearchParams,
  authHeader?: string | null,
): Promise<ApiResponse<unknown>> {
  if (!assertBotServiceToken(authHeader)) return unauthorized();

  const chatId = (searchParams?.get("chatId") ?? "").trim();
  if (!chatId) return validation("chatId required");

  const row = await getActiveBindingByChat(chatId);
  if (!row) return notFound("No ACTIVE binding for chat");

  return { success: true, data: row };
}

export async function botReserveHandler(
  body: unknown,
  authHeader?: string | null,
): Promise<ApiResponse<unknown>> {
  if (!assertBotServiceToken(authHeader)) return unauthorized();

  const parsed = reserveSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const result = await reserveQuota(parsed.data);
  if (!result.ok) {
    return {
      success: false,
      error: {
        code: "QUOTA_EXCEEDED",
        message: "Business storage quota exceeded",
      },
    };
  }
  return { success: true, data: { usage: result.usage } };
}

export async function botIngestHandler(
  body: unknown,
  authHeader?: string | null,
): Promise<ApiResponse<unknown>> {
  if (!assertBotServiceToken(authHeader)) return unauthorized();

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  try {
    const result = await recordTelegramIngest(parsed.data);
    return {
      success: true,
      data: {
        object: {
          id: result.object.id,
          path: result.object.path,
          sizeBytes: result.object.sizeBytes.toString(),
          mime: result.object.mime,
          source: result.object.source,
        },
        usage: result.usage,
      },
    };
  } catch (err) {
    if (
      err instanceof Error &&
      ((err as Error & { code?: string }).code === "QUOTA_EXCEEDED" ||
        err.message === "QUOTA_EXCEEDED")
    ) {
      return {
        success: false,
        error: {
          code: "QUOTA_EXCEEDED",
          message: "Business storage quota exceeded",
        },
      };
    }
    throw err;
  }
}
