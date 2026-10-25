import type { HomepageSectionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type HomepageSectionWriteInput = {
  title?: string;
  subtitle?: string | null;
  sectionType?: HomepageSectionType;
  filters?: Prisma.InputJsonValue;
  shopPageId?: string | null;
  productLimit?: number;
  gridLayout?: string;
  sortOrder?: number;
  isEnabled?: boolean;
};

function mapHomepageSection(row: {
  id: string;
  title: string;
  subtitle: string | null;
  sectionType: HomepageSectionType;
  filters: unknown;
  shopPageId: string | null;
  productLimit: number;
  gridLayout: string;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  shopPage?: { title: string } | null;
}) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    sectionType: row.sectionType,
    filters: (row.filters ?? {}) as Record<string, unknown>,
    shopPageId: row.shopPageId,
    shopPageTitle: row.shopPage?.title ?? null,
    productLimit: row.productLimit,
    gridLayout: (row.gridLayout === "cols3" ? "cols3" : "cols4") as "cols3" | "cols4",
    sortOrder: row.sortOrder,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listHomepageSections() {
  const rows = await prisma.homepageSection.findMany({
    where: { deletedAt: null },
    include: { shopPage: { select: { title: true } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapHomepageSection);
}

export async function findHomepageSectionById(id: string) {
  const row = await prisma.homepageSection.findFirst({
    where: { id, deletedAt: null },
    include: { shopPage: { select: { title: true } } },
  });
  return row ? mapHomepageSection(row) : null;
}

export async function createHomepageSection(
  data: Required<Pick<HomepageSectionWriteInput, "title" | "sectionType">> &
    Omit<HomepageSectionWriteInput, "title" | "sectionType">,
) {
  const maxSort = await prisma.homepageSection.aggregate({
    where: { deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

  const row = await prisma.homepageSection.create({
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      sectionType: data.sectionType,
      filters: data.filters ?? {},
      shopPageId: data.shopPageId ?? null,
      productLimit: data.productLimit ?? 8,
      gridLayout: data.gridLayout ?? "cols4",
      sortOrder,
      isEnabled: data.isEnabled ?? true,
    },
    include: { shopPage: { select: { title: true } } },
  });
  return mapHomepageSection(row);
}

export async function updateHomepageSection(id: string, data: HomepageSectionWriteInput) {
  const row = await prisma.homepageSection.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
      ...(data.sectionType !== undefined ? { sectionType: data.sectionType } : {}),
      ...(data.filters !== undefined ? { filters: data.filters } : {}),
      ...(data.shopPageId !== undefined ? { shopPageId: data.shopPageId } : {}),
      ...(data.productLimit !== undefined ? { productLimit: data.productLimit } : {}),
      ...(data.gridLayout !== undefined ? { gridLayout: data.gridLayout } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
    },
    include: { shopPage: { select: { title: true } } },
  });
  return mapHomepageSection(row);
}

export async function softDeleteHomepageSection(id: string) {
  await prisma.homepageSection.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function swapHomepageSectionOrder(idA: string, idB: string) {
  const [a, b] = await Promise.all([
    prisma.homepageSection.findFirst({ where: { id: idA, deletedAt: null } }),
    prisma.homepageSection.findFirst({ where: { id: idB, deletedAt: null } }),
  ]);
  if (!a || !b) return null;

  await prisma.$transaction([
    prisma.homepageSection.update({
      where: { id: a.id },
      data: { sortOrder: b.sortOrder },
    }),
    prisma.homepageSection.update({
      where: { id: b.id },
      data: { sortOrder: a.sortOrder },
    }),
  ]);

  return listHomepageSections();
}
