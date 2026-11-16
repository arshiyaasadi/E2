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
    lastIngestedMessageId: b.lastIngestedMessageId,
    lastIngestedAt: b.lastIngestedAt?.toISOString() ?? null,
    lastTelegramUpdateId: b.lastTelegramUpdateId?.toString() ?? null,
    ingestPaused: b.ingestPaused,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

function messageIdNum(id: string | null | undefined): bigint | null {
  if (id == null || id === "") return null;
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

/** True when candidate message_id is at or behind the binding watermark. */
export function isAtOrBehindCursor(
  lastIngestedMessageId: string | null | undefined,
  candidateMessageId: string,
): boolean {
  const last = messageIdNum(lastIngestedMessageId);
  const cand = messageIdNum(candidateMessageId);
  if (last == null || cand == null) return false;
  return cand <= last;
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
      lastIngestedMessageId: null,
      lastIngestedAt: null,
      lastTelegramUpdateId: null,
      ingestPaused: false,
    },
    update: {
      registeredByProfileId: input.registeredByProfileId,
      status: "PENDING",
      telegramChatId: null,
      telegramUserId: null,
      title: null,
      lastIngestedMessageId: null,
      lastIngestedAt: null,
      lastTelegramUpdateId: null,
      ingestPaused: false,
    },
  });
}

export async function getTelegramState(businessId: string) {
  const [binding, config, space] = await Promise.all([
    prisma.businessTelegramBinding.findUnique({ where: { businessId } }),
    ensureBusinessTelegramIngestConfig(businessId),
    ensureBusinessFileSpace(businessId),
  ]);

  const recentIngestedCount = binding?.telegramChatId
    ? await prisma.fileObject.count({
        where: {
          spaceId: space.id,
          source: "TELEGRAM",
          telegramChatId: binding.telegramChatId,
        },
      })
    : 0;

  const recentItems = binding?.telegramChatId
    ? await prisma.fileObject.findMany({
        where: {
          spaceId: space.id,
          source: "TELEGRAM",
          telegramChatId: binding.telegramChatId,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          path: true,
          mime: true,
          sizeBytes: true,
          telegramMessageId: true,
          telegramArtifact: true,
          createdAt: true,
        },
      })
    : [];

  return {
    binding: binding ? serializeBinding(binding) : null,
    config: serializeIngestConfig(config),
    usage: serializeSpace(space),
    management: {
      recentIngestedCount,
      recentItems: recentItems.map((o) => ({
        id: o.id,
        path: o.path,
        mime: o.mime,
        sizeBytes: o.sizeBytes.toString(),
        telegramMessageId: o.telegramMessageId,
        telegramArtifact: o.telegramArtifact,
        createdAt: o.createdAt.toISOString(),
      })),
    },
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
      lastIngestedMessageId: null,
      lastIngestedAt: null,
      lastTelegramUpdateId: null,
      ingestPaused: false,
    },
  });
}

export async function setTelegramIngestPaused(
  businessId: string,
  paused: boolean,
) {
  const existing = await prisma.businessTelegramBinding.findUnique({
    where: { businessId },
  });
  if (!existing) return null;
  return prisma.businessTelegramBinding.update({
    where: { businessId },
    data: { ingestPaused: paused },
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

/**
 * Decide whether the bot should ingest this Telegram message.
 * Skips when paused, behind cursor, or artifact already stored.
 */
export async function shouldIngestTelegramMessage(input: {
  chatId: string;
  messageId: string;
  artifact?: string | null;
  updateId?: string | number | null;
}) {
  const row = await getActiveBindingByChat(input.chatId);
  if (!row) {
    return { ok: false as const, reason: "NO_BINDING" as const };
  }
  if (row.binding.ingestPaused) {
    return {
      ok: false as const,
      reason: "PAUSED" as const,
      ...row,
    };
  }
  if (isAtOrBehindCursor(row.binding.lastIngestedMessageId, input.messageId)) {
    return {
      ok: false as const,
      reason: "BEHIND_CURSOR" as const,
      ...row,
    };
  }

  const artifact = input.artifact ?? "meta";
  const existing = await prisma.fileObject.findFirst({
    where: {
      spaceId: row.usage.id,
      telegramChatId: input.chatId,
      telegramMessageId: input.messageId,
      telegramArtifact: artifact,
    },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false as const,
      reason: "ALREADY_STORED" as const,
      ...row,
    };
  }

  return { ok: true as const, reason: "OK" as const, ...row };
}

export async function advanceTelegramCursor(input: {
  businessId: string;
  messageId: string;
  updateId?: string | number | null;
}) {
  const binding = await prisma.businessTelegramBinding.findUnique({
    where: { businessId: input.businessId },
  });
  if (!binding) return null;

  const data: {
    lastIngestedMessageId?: string;
    lastIngestedAt?: Date;
    lastTelegramUpdateId?: bigint;
  } = {};

  if (!isAtOrBehindCursor(binding.lastIngestedMessageId, input.messageId)) {
    data.lastIngestedMessageId = input.messageId;
    data.lastIngestedAt = new Date();
  } else if (binding.lastIngestedMessageId === input.messageId) {
    // Same watermark message finished (e.g. media after meta) — refresh timestamp.
    data.lastIngestedAt = new Date();
  }

  if (input.updateId != null && input.updateId !== "") {
    try {
      const uid = BigInt(input.updateId);
      if (
        binding.lastTelegramUpdateId == null ||
        uid > binding.lastTelegramUpdateId
      ) {
        data.lastTelegramUpdateId = uid;
      }
    } catch {
      /* ignore bad update id */
    }
  }

  if (Object.keys(data).length === 0) {
    return serializeBinding(binding);
  }

  const updated = await prisma.businessTelegramBinding.update({
    where: { id: binding.id },
    data,
  });
  return serializeBinding(updated);
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
  telegramArtifact?: string | null;
  updateId?: string | number | null;
  createdByProfileId?: string | null;
}): Promise<{
  object: FileObject;
  usage: ReturnType<typeof serializeSpace>;
  duplicate: boolean;
  binding: ReturnType<typeof serializeBinding> | null;
}> {
  const space = await ensureBusinessFileSpace(input.businessId);
  const artifact = input.telegramArtifact ?? "meta";

  if (
    input.telegramChatId &&
    input.telegramMessageId
  ) {
    const existing = await prisma.fileObject.findFirst({
      where: {
        spaceId: space.id,
        telegramChatId: input.telegramChatId,
        telegramMessageId: input.telegramMessageId,
        telegramArtifact: artifact,
      },
    });
    if (existing) {
      const binding = await prisma.businessTelegramBinding.findUnique({
        where: { businessId: input.businessId },
      });
      return {
        object: existing,
        usage: serializeSpace(space),
        duplicate: true,
        binding: binding ? serializeBinding(binding) : null,
      };
    }
  }

  if (space.usedBytes + input.sizeBytes > space.quotaBytes) {
    const err = new Error("QUOTA_EXCEEDED");
    (err as Error & { code: string }).code = "QUOTA_EXCEEDED";
    throw err;
  }

  let object: FileObject;
  try {
    object = await prisma.$transaction(async (tx) => {
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
          telegramArtifact: artifact,
          createdByProfileId: input.createdByProfileId ?? null,
        },
        update: {
          mime: input.mime ?? null,
          sizeBytes: input.sizeBytes,
          telegramMessageId: input.telegramMessageId ?? null,
          telegramChatId: input.telegramChatId ?? null,
          telegramArtifact: artifact,
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
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      const existing = await prisma.fileObject.findFirst({
        where: {
          spaceId: space.id,
          telegramChatId: input.telegramChatId ?? undefined,
          telegramMessageId: input.telegramMessageId ?? undefined,
          telegramArtifact: artifact,
        },
      });
      if (existing) {
        const binding = await prisma.businessTelegramBinding.findUnique({
          where: { businessId: input.businessId },
        });
        return {
          object: existing,
          usage: serializeSpace(
            await prisma.fileSpace.findUniqueOrThrow({ where: { id: space.id } }),
          ),
          duplicate: true,
          binding: binding ? serializeBinding(binding) : null,
        };
      }
    }
    throw err;
  }

  const binding = await prisma.businessTelegramBinding.findUnique({
    where: { businessId: input.businessId },
  });

  const refreshed = await prisma.fileSpace.findUniqueOrThrow({
    where: { id: space.id },
  });
  return {
    object,
    usage: serializeSpace(refreshed),
    duplicate: false,
    binding: binding ? serializeBinding(binding) : null,
  };
}
