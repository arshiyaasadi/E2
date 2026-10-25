import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { mapMediaRow } from "@/lib/db/repositories/media.repository";

export type ProductOptionInput = {
  id?: string;
  name: string;
  position: number;
  values: Array<{
    id?: string;
    key?: string;
    value: string;
    position: number;
  }>;
};

export type ProductVariantInput = {
  id?: string;
  sku: string;
  price?: number | null;
  comparePrice?: number | null;
  mediaId?: string | null;
  isDefault?: boolean;
  optionValueKeys: string[];
};

export type ProductVariantsPayload = {
  options: ProductOptionInput[];
  variants: ProductVariantInput[];
};

function decimalToNumber(value: Decimal | null): number | null {
  if (value === null) return null;
  return Number(value.toString());
}

const variantDetailInclude = {
  media: true,
  optionValues: {
    include: {
      optionValue: {
        include: {
          option: true,
        },
      },
    },
  },
} as const;

export async function listProductVariants(productId: string) {
  const rows = await prisma.productVariant.findMany({
    where: { productId, deletedAt: null },
    include: variantDetailInclude,
    orderBy: [{ isDefault: "desc" }, { sku: "asc" }],
  });

  return rows.map((variant) => ({
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    price: decimalToNumber(variant.price),
    comparePrice: decimalToNumber(variant.comparePrice),
    mediaId: variant.mediaId,
    media: variant.media ? mapMediaRow(variant.media) : null,
    isDefault: variant.isDefault,
    optionValues: variant.optionValues.map((link) => ({
      id: link.optionValue.id,
      value: link.optionValue.value,
      position: link.optionValue.position,
      optionId: link.optionValue.optionId,
      optionName: link.optionValue.option.name,
    })),
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
  }));
}

export async function listProductOptions(productId: string) {
  const rows = await prisma.productOption.findMany({
    where: { productId },
    include: {
      values: { orderBy: { position: "asc" } },
    },
    orderBy: { position: "asc" },
  });

  return rows.map((option) => ({
    id: option.id,
    productId: option.productId,
    name: option.name,
    position: option.position,
    values: option.values.map((value) => ({
      id: value.id,
      optionId: value.optionId,
      value: value.value,
      position: value.position,
    })),
  }));
}

export async function syncProductVariants(productId: string, payload: ProductVariantsPayload) {
  await prisma.$transaction(async (tx) => {
    const existingOptions = await tx.productOption.findMany({
      where: { productId },
      include: { values: true },
    });
    const existingVariants = await tx.productVariant.findMany({
      where: { productId, deletedAt: null },
    });

    const payloadOptionIds = new Set(payload.options.map((item) => item.id).filter(Boolean) as string[]);
    const payloadValueIds = new Set(
      payload.options.flatMap((option) => option.values.map((value) => value.id).filter(Boolean) as string[]),
    );
    const payloadVariantIds = new Set(payload.variants.map((item) => item.id).filter(Boolean) as string[]);

    for (const option of existingOptions) {
      if (!payloadOptionIds.has(option.id)) {
        await tx.optionValue.deleteMany({ where: { optionId: option.id } });
        await tx.productOption.delete({ where: { id: option.id } });
      }
    }

    for (const option of existingOptions) {
      for (const value of option.values) {
        if (!payloadValueIds.has(value.id)) {
          await tx.variantOptionValue.deleteMany({ where: { optionValueId: value.id } });
          await tx.optionValue.delete({ where: { id: value.id } });
        }
      }
    }

    for (const variant of existingVariants) {
      if (!payloadVariantIds.has(variant.id)) {
        await tx.variantOptionValue.deleteMany({ where: { variantId: variant.id } });
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { deletedAt: new Date() },
        });
      }
    }

    const valueIdSet = new Set<string>();
    const valueKeyToId = new Map<string, string>();

    for (const optionInput of payload.options) {
      let optionId = optionInput.id;
      if (optionId) {
        await tx.productOption.update({
          where: { id: optionId },
          data: { name: optionInput.name, position: optionInput.position },
        });
      } else {
        const created = await tx.productOption.create({
          data: {
            productId,
            name: optionInput.name,
            position: optionInput.position,
          },
        });
        optionId = created.id;
      }

      for (const valueInput of optionInput.values) {
        let valueId = valueInput.id;
        if (valueId) {
          await tx.optionValue.update({
            where: { id: valueId },
            data: { value: valueInput.value, position: valueInput.position },
          });
        } else {
          const created = await tx.optionValue.create({
            data: {
              optionId,
              value: valueInput.value,
              position: valueInput.position,
            },
          });
          valueId = created.id;
        }
        valueIdSet.add(valueId);
        valueKeyToId.set(valueInput.key ?? valueId, valueId);
        if (valueInput.id) {
          valueKeyToId.set(valueInput.id, valueId);
        }
      }
    }

    const defaultIndex = payload.variants.findIndex((item) => item.isDefault);
    const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;
    const variantIdsInOrder: string[] = [];

    for (let index = 0; index < payload.variants.length; index += 1) {
      const variantInput = payload.variants[index];
      const optionValueIds = variantInput.optionValueKeys
        .map((key) => valueKeyToId.get(key))
        .filter((id): id is string => !!id && valueIdSet.has(id));

      let variantId = variantInput.id;
      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            sku: variantInput.sku,
            price: variantInput.price ?? null,
            comparePrice: variantInput.comparePrice ?? null,
            mediaId: variantInput.mediaId ?? null,
            deletedAt: null,
          },
        });
        await tx.variantOptionValue.deleteMany({ where: { variantId } });
      } else {
        const created = await tx.productVariant.create({
          data: {
            productId,
            sku: variantInput.sku,
            price: variantInput.price ?? null,
            comparePrice: variantInput.comparePrice ?? null,
            mediaId: variantInput.mediaId ?? null,
            isDefault: false,
          },
        });
        variantId = created.id;
      }

      if (optionValueIds.length > 0) {
        await tx.variantOptionValue.createMany({
          data: optionValueIds.map((optionValueId) => ({ variantId, optionValueId })),
          skipDuplicates: true,
        });
      }

      variantIdsInOrder.push(variantId);
    }

    if (variantIdsInOrder.length > 0) {
      const defaultId = variantIdsInOrder[resolvedDefaultIndex] ?? variantIdsInOrder[0];
      await tx.productVariant.updateMany({
        where: { productId, deletedAt: null },
        data: { isDefault: false },
      });
      await tx.productVariant.update({
        where: { id: defaultId },
        data: { isDefault: true },
      });
    }
  });
}

export async function listProductPriceHistory(productId: string) {
  const rows = await prisma.priceHistory.findMany({
    where: {
      OR: [{ productId }, { variant: { productId, deletedAt: null } }],
    },
    include: {
      variant: { select: { id: true, sku: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    variantSku: row.variant?.sku ?? null,
    productId: row.productId,
    oldPrice: decimalToNumber(row.oldPrice),
    newPrice: decimalToNumber(row.newPrice),
    actorType: row.actorType,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listProductSnapshots(productId: string) {
  const rows = await prisma.productHistory.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    snapshot: row.snapshot,
    actorType: row.actorType,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
  }));
}
