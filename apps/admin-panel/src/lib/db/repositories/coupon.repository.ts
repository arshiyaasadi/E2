import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";

export type CouponBenefitType = "percentage" | "fixed" | "free_shipping";
export type CouponScopeType = "order" | "category" | "product" | "first_order";

export type CouponScopeInput = {
  scopeType: CouponScopeType;
  scopeId?: string | null;
};

export type CouponWriteInput = {
  code?: string;
  benefitType?: CouponBenefitType;
  value?: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  isWelcome?: boolean;
  scopes?: CouponScopeInput[];
};

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) return null;
  return Number(value.toString());
}

function mapCoupon(row: {
  id: string;
  code: string;
  benefitType: CouponBenefitType;
  value: Decimal;
  minOrderAmount: Decimal | null;
  maxDiscount: Decimal | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  isWelcome: boolean;
  createdAt: Date;
  updatedAt: Date;
  scopes: Array<{
    id: string;
    scopeType: CouponScopeType;
    scopeId: string | null;
  }>;
}) {
  return {
    id: row.id,
    code: row.code,
    benefitType: row.benefitType,
    value: decimalToNumber(row.value) ?? 0,
    minOrderAmount: decimalToNumber(row.minOrderAmount),
    maxDiscount: decimalToNumber(row.maxDiscount),
    maxUses: row.maxUses,
    maxUsesPerCustomer: row.maxUsesPerCustomer,
    usedCount: row.usedCount,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    isActive: row.isActive,
    isWelcome: row.isWelcome,
    scopes: row.scopes.map((scope) => ({
      id: scope.id,
      scopeType: scope.scopeType,
      scopeId: scope.scopeId,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const couponInclude = {
  scopes: true,
} as const;

async function syncCouponScopes(couponId: string, scopes: CouponScopeInput[]) {
  await prisma.$transaction(async (tx) => {
    await tx.couponScope.deleteMany({ where: { couponId } });
    if (scopes.length === 0) return;

    await tx.couponScope.createMany({
      data: scopes.map((scope) => ({
        couponId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId ?? null,
      })),
    });
  });
}

export async function listCoupons() {
  const rows = await prisma.coupon.findMany({
    where: { deletedAt: null },
    include: couponInclude,
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
  return rows.map(mapCoupon);
}

export async function findCouponById(id: string) {
  const row = await prisma.coupon.findFirst({
    where: { id, deletedAt: null },
    include: couponInclude,
  });
  return row ? mapCoupon(row) : null;
}

export async function couponCodeExists(code: string, excludeId?: string) {
  const row = await prisma.coupon.findFirst({
    where: {
      code,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

async function clearOtherWelcomeFlags(exceptId?: string) {
  await prisma.coupon.updateMany({
    where: {
      isWelcome: true,
      deletedAt: null,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    data: { isWelcome: false },
  });
}

export async function createCoupon(
  data: Required<Pick<CouponWriteInput, "code" | "benefitType">> & CouponWriteInput,
) {
  if (data.isWelcome) {
    await clearOtherWelcomeFlags();
  }

  const row = await prisma.coupon.create({
    data: {
      code: data.code,
      benefitType: data.benefitType,
      value: data.value ?? 0,
      minOrderAmount: data.minOrderAmount ?? null,
      maxDiscount: data.maxDiscount ?? null,
      maxUses: data.maxUses ?? null,
      maxUsesPerCustomer: data.maxUsesPerCustomer ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      isActive: data.isActive ?? true,
      isWelcome: data.isWelcome ?? false,
    },
    include: couponInclude,
  });

  if (data.scopes !== undefined) {
    await syncCouponScopes(row.id, data.scopes);
  } else {
    await syncCouponScopes(row.id, [{ scopeType: "order" }]);
  }

  const refreshed = await findCouponById(row.id);
  return refreshed!;
}

export async function updateCoupon(id: string, data: CouponWriteInput) {
  if (data.isWelcome) {
    await clearOtherWelcomeFlags(id);
  }

  await prisma.coupon.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.benefitType !== undefined ? { benefitType: data.benefitType } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.minOrderAmount !== undefined ? { minOrderAmount: data.minOrderAmount } : {}),
      ...(data.maxDiscount !== undefined ? { maxDiscount: data.maxDiscount } : {}),
      ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
      ...(data.maxUsesPerCustomer !== undefined
        ? { maxUsesPerCustomer: data.maxUsesPerCustomer }
        : {}),
      ...(data.startsAt !== undefined
        ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
        : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.isWelcome !== undefined ? { isWelcome: data.isWelcome } : {}),
    },
  });

  if (data.scopes !== undefined) {
    await syncCouponScopes(id, data.scopes);
  }

  const refreshed = await findCouponById(id);
  return refreshed!;
}

export async function softDeleteCoupon(id: string) {
  await prisma.coupon.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export function couponAuditSnapshot(coupon: Awaited<ReturnType<typeof findCouponById>>) {
  if (!coupon) return null;
  return {
    code: coupon.code,
    benefitType: coupon.benefitType,
    value: coupon.value,
    isActive: coupon.isActive,
    isWelcome: coupon.isWelcome,
    scopeCount: coupon.scopes.length,
  };
}
