import { prisma } from "@/lib/db/prisma";
import { mapMediaRow } from "@/lib/db/repositories/media.repository";

export type BrandWriteInput = {
  name?: string;
  nameFa?: string;
  slug?: string;
  imageId?: string | null;
};

type BrandRow = {
  id: string;
  name: string;
  nameFa: string;
  slug: string;
  imageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  image: {
    id: string;
    storageKey: string;
    url: string;
    title: string | null;
    altText: string | null;
    width: number | null;
    height: number | null;
    mimeType: string | null;
    createdAt: Date;
  } | null;
};

function mapBrand(brand: BrandRow) {
  return {
    id: brand.id,
    name: brand.name,
    nameFa: brand.nameFa,
    slug: brand.slug,
    imageId: brand.imageId,
    image: brand.image ? mapMediaRow(brand.image) : null,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}

const brandInclude = { image: true } as const;

export async function listBrands() {
  const rows = await prisma.brand.findMany({
    where: { deletedAt: null },
    include: brandInclude,
    orderBy: { name: "asc" },
  });
  return rows.map(mapBrand);
}

export async function findBrandById(id: string) {
  const row = await prisma.brand.findFirst({
    where: { id, deletedAt: null },
    include: brandInclude,
  });
  return row ? mapBrand(row) : null;
}

export async function createBrand(
  data: Required<Pick<BrandWriteInput, "name" | "nameFa" | "slug">> & {
    imageId?: string | null;
  },
) {
  const row = await prisma.brand.create({
    data: {
      name: data.name,
      nameFa: data.nameFa,
      slug: data.slug,
      imageId: data.imageId ?? null,
    },
    include: brandInclude,
  });
  return mapBrand(row);
}

export async function updateBrand(id: string, data: BrandWriteInput) {
  const row = await prisma.brand.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nameFa !== undefined ? { nameFa: data.nameFa } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.imageId !== undefined ? { imageId: data.imageId } : {}),
    },
    include: brandInclude,
  });
  return mapBrand(row);
}

export async function softDeleteBrand(id: string) {
  await prisma.brand.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function brandSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.brand.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}
