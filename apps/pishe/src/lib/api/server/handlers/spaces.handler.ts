import { z } from "zod";
import { getSessionFromCookies } from "@/lib/api/server/session";
import { getBusiness, getMembership } from "@/lib/db/business";
import { requireProfileBySub } from "@/lib/db/profile";
import {
  getBusinessSpaceUsage,
  getTelegramState,
  getUserSpaceUsage,
  prepareTelegramBinding,
  serializeBinding,
  serializeIngestConfig,
  setTelegramIngestPaused,
  unlinkTelegramBinding,
  updateIngestConfig,
} from "@/lib/db/spaces";
import type { ApiResponse } from "@/types/api";

const ingestPatchSchema = z.object({
  storeText: z.boolean().optional(),
  downloadPhoto: z.boolean().optional(),
  downloadDocument: z.boolean().optional(),
  downloadVideo: z.boolean().optional(),
  downloadAudio: z.boolean().optional(),
  maxMediaBytes: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const n = typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(v);
      if (n < BigInt(1024) || n > BigInt(100) * BigInt(1024) * BigInt(1024)) {
        ctx.addIssue({
          code: "custom",
          message: "maxMediaBytes must be between 1KiB and 100MiB",
        });
        return z.NEVER;
      }
      return n;
    }),
});

function unauthorized(): ApiResponse<never> {
  return {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Not authenticated" },
  };
}

function forbidden(message = "Forbidden"): ApiResponse<never> {
  return { success: false, error: { code: "FORBIDDEN", message } };
}

function notFound(message = "Not found"): ApiResponse<never> {
  return { success: false, error: { code: "NOT_FOUND", message } };
}

function validation(message: string): ApiResponse<never> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

async function sessionProfile() {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const profile = await requireProfileBySub(session.sub);
  return { session, profile };
}

async function requireBusinessMember(businessId: string) {
  const ctx = await sessionProfile();
  if (!ctx) return { error: unauthorized() as ApiResponse<never> };

  const business = await getBusiness(businessId);
  if (!business) return { error: notFound("Business not found") };

  const membership = await getMembership(ctx.profile.id, businessId);
  if (!ctx.profile.isSuperAdmin && !membership) {
    return { error: forbidden() };
  }

  return { ctx, business, membership };
}

export async function getMyUsageHandler(): Promise<
  ApiResponse<{ usage: ReturnType<typeof getUserSpaceUsage> extends Promise<infer T> ? T : never }>
> {
  const ctx = await sessionProfile();
  if (!ctx) return unauthorized();
  const usage = await getUserSpaceUsage(ctx.profile.id);
  return { success: true, data: { usage } };
}

export async function getBusinessUsageHandler(
  businessId: string,
): Promise<
  ApiResponse<{ usage: Awaited<ReturnType<typeof getBusinessSpaceUsage>> }>
> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;
  const usage = await getBusinessSpaceUsage(businessId);
  return { success: true, data: { usage } };
}

export async function getBusinessTelegramHandler(businessId: string): Promise<
  ApiResponse<{
    telegram: Awaited<ReturnType<typeof getTelegramState>> & {
      deepLink: string | null;
      botUsername: string;
      businessCode: string;
    };
  }>
> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const state = await getTelegramState(businessId);
  const botUsername =
    process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "e2pishe_bot";
  const deepLink = `https://t.me/${botUsername}?start=${gate.business!.code}`;

  return {
    success: true,
    data: {
      telegram: {
        ...state,
        deepLink,
        botUsername,
        businessCode: gate.business!.code,
      },
    },
  };
}

export async function prepareBusinessTelegramHandler(
  businessId: string,
): Promise<
  ApiResponse<{
    binding: ReturnType<typeof serializeBinding>;
    deepLink: string;
    businessCode: string;
    botUsername: string;
  }>
> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const canPrepare =
    gate.ctx!.profile.isSuperAdmin ||
    gate.membership?.role === "MANAGER" ||
    gate.membership?.role === "ASSISTANT";
  if (!canPrepare) return forbidden("Members only");

  const binding = await prepareTelegramBinding({
    businessId,
    registeredByProfileId: gate.ctx!.profile.id,
  });

  const botUsername =
    process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "e2pishe_bot";
  const deepLink = `https://t.me/${botUsername}?start=${gate.business!.code}`;

  return {
    success: true,
    data: {
      binding: serializeBinding(binding),
      deepLink,
      businessCode: gate.business!.code,
      botUsername,
    },
  };
}

export async function patchBusinessTelegramConfigHandler(
  businessId: string,
  body: unknown,
): Promise<
  ApiResponse<{ config: ReturnType<typeof serializeIngestConfig> }>
> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const canManage =
    gate.ctx!.profile.isSuperAdmin ||
    gate.membership?.role === "MANAGER" ||
    gate.membership?.role === "ASSISTANT";
  if (!canManage) return forbidden("Members only");

  const parsed = ingestPatchSchema.safeParse(body);
  if (!parsed.success) {
    return validation(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const updated = await updateIngestConfig(businessId, parsed.data);
  return {
    success: true,
    data: { config: serializeIngestConfig(updated) },
  };
}

export async function unlinkBusinessTelegramHandler(
  businessId: string,
): Promise<ApiResponse<{ binding: ReturnType<typeof serializeBinding> | null }>> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const canManage =
    gate.ctx!.profile.isSuperAdmin || gate.membership?.role === "MANAGER";
  if (!canManage) return forbidden("Manager only");

  const updated = await unlinkTelegramBinding(businessId);
  return {
    success: true,
    data: { binding: updated ? serializeBinding(updated) : null },
  };
}

export async function pauseBusinessTelegramHandler(
  businessId: string,
): Promise<ApiResponse<{ binding: ReturnType<typeof serializeBinding> }>> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const canManage =
    gate.ctx!.profile.isSuperAdmin ||
    gate.membership?.role === "MANAGER" ||
    gate.membership?.role === "ASSISTANT";
  if (!canManage) return forbidden("Members only");

  const updated = await setTelegramIngestPaused(businessId, true);
  if (!updated) return notFound("Telegram binding not found");
  return { success: true, data: { binding: serializeBinding(updated) } };
}

export async function resumeBusinessTelegramHandler(
  businessId: string,
): Promise<ApiResponse<{ binding: ReturnType<typeof serializeBinding> }>> {
  const gate = await requireBusinessMember(businessId);
  if ("error" in gate && gate.error) return gate.error;

  const canManage =
    gate.ctx!.profile.isSuperAdmin ||
    gate.membership?.role === "MANAGER" ||
    gate.membership?.role === "ASSISTANT";
  if (!canManage) return forbidden("Members only");

  const updated = await setTelegramIngestPaused(businessId, false);
  if (!updated) return notFound("Telegram binding not found");
  return { success: true, data: { binding: serializeBinding(updated) } };
}
