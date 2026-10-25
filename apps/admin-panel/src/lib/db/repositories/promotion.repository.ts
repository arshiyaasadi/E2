import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";

export type PromotionType = "percentage" | "fixed";
export type PromotionTargetType = "category" | "product";

export type PromotionTargetInput = {
  targetType: PromotionTargetType;
  targetId: string;
};

export type PromotionWriteInput = {
  name?: string;
  type?: PromotionType;
  value?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  targets?: PromotionTargetInput[];
};

function decimalToNumber(value: Decimal): number {
  return Number(value.toString());
}

function mapPromotion(row: {
  id: string;
  name: string;
  type: PromotionType;
  value: Decimal;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  targets: Array<{
    id: string;
    targetType: PromotionTargetType;
    targetId: string;
  }>;
}) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: decimalToNumber(row.value),
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    isActive: row.isActive,
    targets: row.targets.map((target) => ({
      id: target.id,
      targetType: target.targetType,
      targetId: target.targetId,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const promotionInclude = {
  targets: true,
} as const;

async function syncPromotionTargets(promotionId: string, targets: PromotionTargetInput[]) {
  await prisma.$transaction(async (tx) => {
    await tx.promotionTarget.deleteMany({ where: { promotionId } });
    if (targets.length === 0) return;

    await tx.promotionTarget.createMany({
      data: targets.map((target) => ({
        promotionId,
        targetType: target.targetType,
        targetId: target.targetId,
      })),
    });
  });
}

export async function listPromotions() {
  const rows = await prisma.promotion.findMany({
    where: { deletedAt: null },
    include: promotionInclude,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return rows.map(mapPromotion);
}

export async function findPromotionById(id: string) {
  const row = await prisma.promotion.findFirst({
    where: { id, deletedAt: null },
    include: promotionInclude,
  });
  return row ? mapPromotion(row) : null;
}

export async function createPromotion(
  data: Required<Pick<PromotionWriteInput, "name" | "type" | "value">> & PromotionWriteInput,
) {
  const row = await prisma.promotion.create({
    data: {
      name: data.name,
      type: data.type,
      value: data.value,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive ?? true,
    },
    include: promotionInclude,
  });

  if (data.targets !== undefined) {
    await syncPromotionTargets(row.id, data.targets);
  }

  const refreshed = await findPromotionById(row.id);
  return refreshed!;
}

export async function updatePromotion(id: string, data: PromotionWriteInput) {
  await prisma.promotion.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.startsAt !== undefined
        ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
        : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  if (data.targets !== undefined) {
    await syncPromotionTargets(id, data.targets);
  }

  const refreshed = await findPromotionById(id);
  return refreshed!;
}

export async function softDeletePromotion(id: string) {
  await prisma.promotion.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export function promotionAuditSnapshot(promotion: Awaited<ReturnType<typeof findPromotionById>>) {
  if (!promotion) return null;
  return {
    name: promotion.name,
    type: promotion.type,
    value: promotion.value,
    isActive: promotion.isActive,
    targetCount: promotion.targets.length,
  };
}
