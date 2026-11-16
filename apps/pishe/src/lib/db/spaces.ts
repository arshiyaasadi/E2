import type {
  BusinessTelegramBinding,
  BusinessTelegramIngestConfig,
  FileObject,
  FileSpace,
  TelegramBindingStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** User personal space quota: 100 MiB. */
export const USER_QUOTA_BYTES = BigInt(100) * BigInt(1024) * BigInt(1024);
/** Business space quota: 2 GiB. */
export const BUSINESS_QUOTA_BYTES = BigInt(2) * BigInt(1024) * BigInt(1024) * BigInt(1024);
/** Default per-object media cap: 25 MiB. */
export const DEFAULT_MAX_MEDIA_BYTES = BigInt(25) * BigInt(1024) * BigInt(1024);

export function serializeSpace(space: FileSpace) {
  return {
    id: space.id,
    kind: space.kind,
    ownerProfileId: space.ownerProfileId,
    businessId: space.businessId,
    quotaBytes: space.quotaBytes.toString(),
    usedBytes: space.usedBytes.toString(),
    remainingBytes: (space.quotaBytes - space.usedBytes).toString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export function serializeIngestConfig(cfg: BusinessTelegramIngestConfig) {
  return {
    storeText: cfg.storeText,
    downloadPhoto: cfg.downloadPhoto,
    downloadDocument: cfg.downloadDocument,
    downloadVideo: cfg.downloadVideo,
    downloadAudio: cfg.downloadAudio,
    maxMediaBytes: cfg.maxMediaBytes.toString(),
    updatedAt: cfg.updatedAt.toISOString(),
  };
}

export function serializeBinding(b: BusinessTelegramBinding) {
  return {
    id: b.id,
    businessId: b.businessId,
    telegramChatId: b.telegramChatId,
    telegramUserId: b.telegramUserId,
    registeredByProfileId: b.registeredByProfileId,
    status: b.status,
    title: b.title,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function ensureUserFileSpace(profileId: string): Promise<FileSpace> {
  return prisma.fileSpace.upsert({
    where: { ownerProfileId: profileId },
    create: {
      kind: "USER",
      ownerProfileId: profileId,
      quotaBytes: USER_QUOTA_BYTES,
      usedBytes: BigInt(0),
    },
    update: {},
  });
}

export async function ensureBusinessFileSpace(
  businessId: string,
): Promise<FileSpace> {
  return prisma.fileSpace.upsert({
    where: { businessId },
    create: {
      kind: "BUSINESS",
      businessId,
      quotaBytes: BUSINESS_QUOTA_BYTES,
      usedBytes: BigInt(0),
    },
    update: {},
  });
}

export async function ensureBusinessTelegramIngestConfig(
  businessId: string,
): Promise<BusinessTelegramIngestConfig> {
  return prisma.businessTelegramIngestConfig.upsert({
    where: { businessId },
    create: {
      businessId,
      storeText: true,
      downloadPhoto: true,
      downloadDocument: true,
      downloadVideo: true,
      downloadAudio: true,
      maxMediaBytes: DEFAULT_MAX_MEDIA_BYTES,
    },
    update: {},
  });
}

export async function backfillSpacesAndConfigs() {
  const profiles = await prisma.profile.findMany({ select: { id: true } });
  for (const p of profiles) {
    await ensureUserFileSpace(p.id);
  }
  const businesses = await prisma.business.findMany({ select: { id: true } });
  for (const b of businesses) {
    await ensureBusinessFileSpace(b.id);
    await ensureBusinessTelegramIngestConfig(b.id);
  }
  return {
    profiles: profiles.length,
    businesses: businesses.length,
  };
}

export async function getUserSpaceUsage(profileId: string) {
  const space = await ensureUserFileSpace(profileId);
  return serializeSpace(space);
}

export async function getBusinessSpaceUsage(businessId: string) {
  const space = await ensureBusinessFileSpace(businessId);
  return serializeSpace(space);
}

export async function prepareTelegramBinding(input: {
  businessId: string;
  registeredByProfileId: string;
}) {
  await ensureBusinessFileSpace(input.businessId);
  await ensureBusinessTelegramIngestConfig(input.businessId);

  return prisma.businessTelegramBinding.upsert({
    where: { businessId: input.businessId },
    create: {
      businessId: input.businessId,
      registeredByProfileId: input.registeredByProfileId,
      status: "PENDING",
      telegramChatId: null,
      telegramUserId: null,
      title: null,
    },
    update: {
      registeredByProfileId: input.registeredByProfileId,
      status: "PENDING",
      telegramChatId: null,
      telegramUserId: null,
      title: null,
    },
  });
}

export async function getTelegramState(businessId: string) {
  const [binding, config, space] = await Promise.all([
    prisma.businessTelegramBinding.findUnique({ where: { businessId } }),
    ensureBusinessTelegramIngestConfig(businessId),
    ensureBusinessFileSpace(businessId),
  ]);
  return {
    binding: binding ? serializeBinding(binding) : null,
    config: serializeIngestConfig(config),
    usage: serializeSpace(space),
  };
}

export async function updateIngestConfig(
  businessId: string,
  input: Partial<{
    storeText: boolean;
    downloadPhoto: boolean;
    downloadDocument: boolean;
    downloadVideo: boolean;
    downloadAudio: boolean;
    maxMediaBytes: bigint;
  }>,
) {
  await ensureBusinessTelegramIngestConfig(businessId);
  return prisma.businessTelegramIngestConfig.update({
    where: { businessId },
    data: {
      ...(input.storeText !== undefined ? { storeText: input.storeText } : {}),
      ...(input.downloadPhoto !== undefined
        ? { downloadPhoto: input.downloadPhoto }
        : {}),
      ...(input.downloadDocument !== undefined
        ? { downloadDocument: input.downloadDocument }
        : {}),
      ...(input.downloadVideo !== undefined
        ? { downloadVideo: input.downloadVideo }
        : {}),
      ...(input.downloadAudio !== undefined
        ? { downloadAudio: input.downloadAudio }
        : {}),
      ...(input.maxMediaBytes !== undefined
        ? { maxMediaBytes: input.maxMediaBytes }
        : {}),
    },
  });
}

export async function unlinkTelegramBinding(businessId: string) {
  const existing = await prisma.businessTelegramBinding.findUnique({
    where: { businessId },
  });
  if (!existing) return null;
  return prisma.businessTelegramBinding.update({
    where: { businessId },
    data: {
      status: "REVOKED" satisfies TelegramBindingStatus,
      telegramChatId: null,
      telegramUserId: null,
      title: null,
    },
  });
}

export async function findBusinessByCode(code: string) {
  return prisma.business.findUnique({ where: { code } });
}

export async function verifyTelegramCode(input: {
  code: string;
  telegramUserId: string;
}) {
  const business = await findBusinessByCode(input.code);
  if (!business) return { ok: false as const, reason: "NOT_FOUND" as const };

  const binding = await prisma.businessTelegramBinding.findUnique({
    where: { businessId: business.id },
  });
  if (!binding || binding.status !== "PENDING") {
    return { ok: false as const, reason: "NOT_PENDING" as const };
  }

  const membership = await prisma.businessMembership.findUnique({
    where: {
      profileId_businessId: {
        profileId: binding.registeredByProfileId,
        businessId: business.id,
      },
    },
  });
  if (!membership) {
    return { ok: false as const, reason: "FORBIDDEN" as const };
  }

  const updated = await prisma.businessTelegramBinding.update({
    where: { id: binding.id },
    data: { telegramUserId: input.telegramUserId },
  });

  return {
    ok: true as const,
    business: { id: business.id, name: business.name, code: business.code },
    binding: serializeBinding(updated),
  };
}

export async function bindTelegramChat(input: {
  telegramUserId: string;
  chatId: string;
  title?: string | null;
}) {
  const binding = await prisma.businessTelegramBinding.findFirst({
    where: {
      telegramUserId: input.telegramUserId,
      status: "PENDING",
    },
    include: { business: { select: { id: true, name: true, code: true } } },
  });
  if (!binding) {
    return { ok: false as const, reason: "NO_PENDING" as const };
  }

  const conflict = await prisma.businessTelegramBinding.findFirst({
    where: {
      telegramChatId: input.chatId,
      NOT: { id: binding.id },
    },
  });
  if (conflict) {
    return { ok: false as const, reason: "CHAT_TAKEN" as const };
  }

  const updated = await prisma.businessTelegramBinding.update({
    where: { id: binding.id },
    data: {
      telegramChatId: input.chatId,
      title: input.title?.trim() || null,
      status: "ACTIVE",
    },
  });

  return {
    ok: true as const,
    business: binding.business,
    binding: serializeBinding(updated),
  };
}

export async function getActiveBindingByChat(chatId: string) {
  const binding = await prisma.businessTelegramBinding.findFirst({
    where: { telegramChatId: chatId, status: "ACTIVE" },
    include: {
      business: { select: { id: true, name: true, code: true } },
    },
  });
  if (!binding) return null;

  const [config, space] = await Promise.all([
    ensureBusinessTelegramIngestConfig(binding.businessId),
    ensureBusinessFileSpace(binding.businessId),
  ]);

  return {
    binding: serializeBinding(binding),
    business: binding.business,
    config: serializeIngestConfig(config),
    usage: serializeSpace(space),
  };
}

export async function reserveQuota(input: {
  businessId: string;
  sizeBytes: bigint;
}) {
  const space = await ensureBusinessFileSpace(input.businessId);
  if (space.usedBytes + input.sizeBytes > space.quotaBytes) {
    return {
      ok: false as const,
      usage: serializeSpace(space),
      reason: "QUOTA_EXCEEDED" as const,
    };
  }
  return { ok: true as const, usage: serializeSpace(space) };
}

export async function recordTelegramIngest(input: {
  businessId: string;
  path: string;
  mime?: string | null;
  sizeBytes: bigint;
  telegramMessageId?: string | null;
  telegramChatId?: string | null;
  createdByProfileId?: string | null;
}): Promise<{ object: FileObject; usage: ReturnType<typeof serializeSpace> }> {
  const space = await ensureBusinessFileSpace(input.businessId);
  if (space.usedBytes + input.sizeBytes > space.quotaBytes) {
    const err = new Error("QUOTA_EXCEEDED");
    (err as Error & { code: string }).code = "QUOTA_EXCEEDED";
    throw err;
  }

  const object = await prisma.$transaction(async (tx) => {
    const created = await tx.fileObject.upsert({
      where: {
        spaceId_path: { spaceId: space.id, path: input.path },
      },
      create: {
        spaceId: space.id,
        path: input.path,
        mime: input.mime ?? null,
        sizeBytes: input.sizeBytes,
        source: "TELEGRAM",
        telegramMessageId: input.telegramMessageId ?? null,
        telegramChatId: input.telegramChatId ?? null,
        createdByProfileId: input.createdByProfileId ?? null,
      },
      update: {
        mime: input.mime ?? null,
        sizeBytes: input.sizeBytes,
        telegramMessageId: input.telegramMessageId ?? null,
        telegramChatId: input.telegramChatId ?? null,
      },
    });

    const aggregate = await tx.fileObject.aggregate({
      where: { spaceId: space.id },
      _sum: { sizeBytes: true },
    });
    const used = aggregate._sum.sizeBytes ?? BigInt(0);
    await tx.fileSpace.update({
      where: { id: space.id },
      data: { usedBytes: used },
    });
    return created;
  });

  const refreshed = await prisma.fileSpace.findUniqueOrThrow({
    where: { id: space.id },
  });
  return { object, usage: serializeSpace(refreshed) };
}
