import { prisma } from "@/lib/db/prisma";

export type TagWriteInput = {
  name?: string;
  nameFa?: string;
  slug?: string;
};

function mapTag(tag: {
  id: string;
  name: string;
  nameFa: string;
  slug: string;
  createdAt: Date;
}) {
  return {
    id: tag.id,
    name: tag.name,
    nameFa: tag.nameFa,
    slug: tag.slug,
    createdAt: tag.createdAt.toISOString(),
  };
}

export async function listTags() {
  const rows = await prisma.tag.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return rows.map(mapTag);
}

export async function findTagById(id: string) {
  const row = await prisma.tag.findFirst({
    where: { id, deletedAt: null },
  });
  return row ? mapTag(row) : null;
}

export async function createTag(
  data: Required<Pick<TagWriteInput, "name" | "nameFa" | "slug">>,
) {
  const row = await prisma.tag.create({
    data: {
      name: data.name,
      nameFa: data.nameFa,
      slug: data.slug,
    },
  });
  return mapTag(row);
}

export async function updateTag(id: string, data: TagWriteInput) {
  const row = await prisma.tag.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nameFa !== undefined ? { nameFa: data.nameFa } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
    },
  });
  return mapTag(row);
}

export async function softDeleteTag(id: string) {
  await prisma.tag.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function tagSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.tag.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

export async function syncProductTags(productId: string, tagIds: string[]) {
  await prisma.$transaction(async (tx) => {
    await tx.productTag.deleteMany({ where: { productId } });
    if (tagIds.length === 0) return;

    await tx.productTag.createMany({
      data: tagIds.map((tagId) => ({ productId, tagId })),
      skipDuplicates: true,
    });
  });
}
