import { Prisma, type BlogPostStatus as PrismaBlogPostStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { emptyTipTapDoc } from "@/features/blog/schema";
import type {
  BlogCategoryDto,
  BlogEmbeddedProductDto,
  BlogFaqItem,
  BlogPostDto,
  BlogPostListItemDto,
  BlogPostStatus,
  BlogTagDto,
  MediaDto,
} from "@/types/domain";

type MediaRow = {
  id: string;
  url: string;
  thumbUrl: string | null;
  altText: string | null;
  title: string | null;
  folder: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
};

function mapMediaFull(media: MediaRow & { storageKey: string; createdAt: Date } | null): MediaDto | null {
  if (!media) return null;
  return {
    id: media.id,
    url: media.url,
    thumbUrl: media.thumbUrl,
    altText: media.altText,
    title: media.title,
    folder: media.folder,
    width: media.width,
    height: media.height,
    mimeType: media.mimeType,
    storageKey: media.storageKey,
    createdAt: media.createdAt.toISOString(),
  };
}

function parseFaqItems(value: unknown): BlogFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is BlogFaqItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as BlogFaqItem).question === "string" &&
        typeof (item as BlogFaqItem).answer === "string",
    )
    .map((item) => ({ question: item.question, answer: item.answer }));
}

function asContent(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { ...emptyTipTapDoc };
}

/** Collect productEmbed productIds from TipTap JSON */
export function extractEmbeddedProductIds(content: unknown): string[] {
  const ids = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; attrs?: { productId?: string }; content?: unknown[] };
    if (n.type === "productEmbed" && typeof n.attrs?.productId === "string") {
      ids.add(n.attrs.productId);
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(content);
  return [...ids];
}

export function resolveEffectiveStatus(
  status: BlogPostStatus,
  scheduledAt: Date | null,
  now = new Date(),
): BlogPostStatus {
  if (status === "pending" && scheduledAt && scheduledAt.getTime() <= now.getTime()) {
    return "published";
  }
  if (status === "published" && scheduledAt && scheduledAt.getTime() > now.getTime()) {
    return "pending";
  }
  return status;
}

function mapCategory(row: {
  id: string;
  parentId: string | null;
  name: string | null;
  nameFa: string;
  slug: string;
  description: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): BlogCategoryDto {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    nameFa: row.nameFa,
    slug: row.slug,
    description: row.description,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTag(row: {
  id: string;
  name: string | null;
  nameFa: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}): BlogTagDto {
  return {
    id: row.id,
    name: row.name,
    nameFa: row.nameFa,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const postInclude = {
  coverImage: true,
  ogImage: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} as const;

async function resolveEmbeddedProducts(content: unknown): Promise<BlogEmbeddedProductDto[]> {
  const ids = extractEmbeddedProductIds(content);
  if (ids.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: {
      media: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
        take: 1,
        include: { media: true },
      },
    },
  });

  return products.map((p) => {
    const first = p.media[0]?.media ?? null;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      basePrice: p.basePrice != null ? Number(p.basePrice) : null,
      comparePrice: p.comparePrice != null ? Number(p.comparePrice) : null,
      imageUrl: first?.url ?? null,
      imageAlt: first?.altText ?? null,
      status: p.status,
    };
  });
}

function mapPostListItem(
  row: {
    id: string;
    title: string | null;
    titleFa: string;
    slug: string;
    excerptFa: string | null;
    status: PrismaBlogPostStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    coverImage: (MediaRow & { storageKey: string; createdAt: Date }) | null;
    categories: Array<{ categoryId: string }>;
    tags: Array<{ tagId: string }>;
  },
): BlogPostListItemDto {
  const status = row.status as BlogPostStatus;
  return {
    id: row.id,
    title: row.title,
    titleFa: row.titleFa,
    slug: row.slug,
    excerptFa: row.excerptFa,
    status,
    effectiveStatus: resolveEffectiveStatus(status, row.scheduledAt),
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    coverImage: mapMediaFull(row.coverImage),
    categoryIds: row.categories.map((c) => c.categoryId),
    tagIds: row.tags.map((t) => t.tagId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function mapPostDetail(
  row: {
    id: string;
    title: string | null;
    titleFa: string;
    slug: string;
    excerpt: string | null;
    excerptFa: string | null;
    content: unknown;
    coverImageId: string | null;
    authorAdminId: string | null;
    status: PrismaBlogPostStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    seoTitle: string | null;
    seoDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageId: string | null;
    canonicalUrl: string | null;
    metaRobots: string;
    faqItems: unknown;
    createdAt: Date;
    updatedAt: Date;
    coverImage: (MediaRow & { storageKey: string; createdAt: Date }) | null;
    ogImage: (MediaRow & { storageKey: string; createdAt: Date }) | null;
    categories: Array<{ categoryId: string; category: Parameters<typeof mapCategory>[0] }>;
    tags: Array<{ tagId: string; tag: Parameters<typeof mapTag>[0] }>;
  },
): Promise<BlogPostDto> {
  const list = mapPostListItem(row);
  const embeddedProducts = await resolveEmbeddedProducts(row.content);
  return {
    ...list,
    excerpt: row.excerpt,
    excerptFa: row.excerptFa,
    content: asContent(row.content),
    coverImageId: row.coverImageId,
    ogImageId: row.ogImageId,
    ogImage: mapMediaFull(row.ogImage),
    authorAdminId: row.authorAdminId,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    canonicalUrl: row.canonicalUrl,
    metaRobots: row.metaRobots,
    faqItems: parseFaqItems(row.faqItems),
    categories: row.categories.map((c) => mapCategory(c.category)),
    tags: row.tags.map((t) => mapTag(t.tag)),
    embeddedProducts,
  };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listBlogCategories() {
  const rows = await prisma.blogCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ position: "asc" }, { nameFa: "asc" }],
  });
  return rows.map(mapCategory);
}

export async function findBlogCategoryById(id: string) {
  const row = await prisma.blogCategory.findFirst({ where: { id, deletedAt: null } });
  return row ? mapCategory(row) : null;
}

export async function blogCategorySlugExists(slug: string, excludeId?: string) {
  const row = await prisma.blogCategory.findFirst({
    where: { slug, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!row;
}

export async function createBlogCategory(data: {
  parentId?: string | null;
  name?: string | null;
  nameFa: string;
  slug: string;
  description?: string | null;
  position?: number;
}) {
  const row = await prisma.blogCategory.create({
    data: {
      parentId: data.parentId ?? null,
      name: data.name ?? null,
      nameFa: data.nameFa,
      slug: data.slug,
      description: data.description ?? null,
      position: data.position ?? 0,
    },
  });
  return mapCategory(row);
}

export async function updateBlogCategory(
  id: string,
  data: {
    parentId?: string | null;
    name?: string | null;
    nameFa?: string;
    slug?: string;
    description?: string | null;
    position?: number;
  },
) {
  const row = await prisma.blogCategory.update({
    where: { id },
    data: {
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nameFa !== undefined ? { nameFa: data.nameFa } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
    },
  });
  return mapCategory(row);
}

export async function softDeleteBlogCategory(id: string) {
  await prisma.blogCategory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listBlogTags() {
  const rows = await prisma.blogTag.findMany({
    where: { deletedAt: null },
    orderBy: { nameFa: "asc" },
  });
  return rows.map(mapTag);
}

export async function findBlogTagById(id: string) {
  const row = await prisma.blogTag.findFirst({ where: { id, deletedAt: null } });
  return row ? mapTag(row) : null;
}

export async function blogTagSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.blogTag.findFirst({
    where: { slug, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!row;
}

export async function createBlogTag(data: {
  name?: string | null;
  nameFa: string;
  slug: string;
}) {
  const row = await prisma.blogTag.create({
    data: {
      name: data.name ?? null,
      nameFa: data.nameFa,
      slug: data.slug,
    },
  });
  return mapTag(row);
}

export async function updateBlogTag(
  id: string,
  data: { name?: string | null; nameFa?: string; slug?: string },
) {
  const row = await prisma.blogTag.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.nameFa !== undefined ? { nameFa: data.nameFa } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
    },
  });
  return mapTag(row);
}

export async function softDeleteBlogTag(id: string) {
  await prisma.blogTag.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type BlogPostWriteInput = {
  titleFa?: string;
  title?: string | null;
  slug?: string;
  excerpt?: string | null;
  excerptFa?: string | null;
  content?: Record<string, unknown>;
  coverImageId?: string | null;
  authorAdminId?: string | null;
  status?: BlogPostStatus;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageId?: string | null;
  canonicalUrl?: string | null;
  metaRobots?: string;
  faqItems?: BlogFaqItem[];
  categoryIds?: string[];
  tagIds?: string[];
};

async function syncPostTaxonomy(
  tx: Prisma.TransactionClient,
  postId: string,
  categoryIds?: string[],
  tagIds?: string[],
) {
  if (categoryIds !== undefined) {
    await tx.blogPostCategory.deleteMany({ where: { postId } });
    if (categoryIds.length > 0) {
      await tx.blogPostCategory.createMany({
        data: categoryIds.map((categoryId, position) => ({ postId, categoryId, position })),
        skipDuplicates: true,
      });
    }
  }
  if (tagIds !== undefined) {
    await tx.blogPostTag.deleteMany({ where: { postId } });
    if (tagIds.length > 0) {
      await tx.blogPostTag.createMany({
        data: tagIds.map((tagId) => ({ postId, tagId })),
        skipDuplicates: true,
      });
    }
  }
}

export async function listBlogPosts(filters?: {
  status?: BlogPostStatus;
  categoryId?: string;
  q?: string;
}) {
  const rows = await prisma.blogPost.findMany({
    where: {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.categoryId
        ? { categories: { some: { categoryId: filters.categoryId } } }
        : {}),
      ...(filters?.q
        ? {
            OR: [
              { titleFa: { contains: filters.q, mode: "insensitive" } },
              { title: { contains: filters.q, mode: "insensitive" } },
              { slug: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      coverImage: true,
      categories: true,
      tags: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(mapPostListItem);
}

export async function findBlogPostById(id: string): Promise<BlogPostDto | null> {
  const row = await prisma.blogPost.findFirst({
    where: { id, deletedAt: null },
    include: postInclude,
  });
  if (!row) return null;
  return mapPostDetail(row);
}

export async function findBlogPostBySlug(slug: string): Promise<BlogPostDto | null> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null },
    include: postInclude,
  });
  if (!row) return null;
  return mapPostDetail(row);
}

export async function listPublishedBlogPosts() {
  const now = new Date();
  const rows = await prisma.blogPost.findMany({
    where: {
      deletedAt: null,
      OR: [
        { status: "published", OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
        { status: "pending", scheduledAt: { lte: now } },
      ],
    },
    include: {
      coverImage: true,
      categories: true,
      tags: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapPostListItem);
}

export async function findPublishedBlogPostBySlug(slug: string): Promise<BlogPostDto | null> {
  const post = await findBlogPostBySlug(slug);
  if (!post) return null;
  const effective = resolveEffectiveStatus(
    post.status,
    post.scheduledAt ? new Date(post.scheduledAt) : null,
  );
  if (effective !== "published") return null;
  return post;
}

export async function blogPostSlugExists(slug: string, excludeId?: string) {
  const row = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  return !!row;
}

function computePublishFields(
  status: BlogPostStatus | undefined,
  scheduledAt: Date | null | undefined,
  existingPublishedAt?: Date | null,
) {
  if (!status) return {};
  const now = new Date();
  if (status === "published") {
    const sched = scheduledAt === undefined ? null : scheduledAt;
    if (sched && sched.getTime() > now.getTime()) {
      return { status: "pending" as const, publishedAt: existingPublishedAt ?? null };
    }
    return { status: "published" as const, publishedAt: existingPublishedAt ?? now };
  }
  if (status === "pending") {
    return { status: "pending" as const, publishedAt: existingPublishedAt ?? null };
  }
  return { status: "draft" as const, publishedAt: null };
}

export async function createBlogPost(data: Required<Pick<BlogPostWriteInput, "titleFa" | "slug">> & BlogPostWriteInput) {
  const status = data.status ?? "draft";
  const scheduledAt = data.scheduledAt ?? null;
  const publish = computePublishFields(status, scheduledAt, null);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.blogPost.create({
      data: {
        titleFa: data.titleFa,
        title: data.title ?? null,
        slug: data.slug,
        excerpt: data.excerpt ?? null,
        excerptFa: data.excerptFa ?? null,
        content: (data.content ?? emptyTipTapDoc) as Prisma.InputJsonValue,
        coverImageId: data.coverImageId ?? null,
        authorAdminId: data.authorAdminId ?? null,
        status: publish.status ?? status,
        scheduledAt,
        publishedAt: publish.publishedAt ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogTitle: data.ogTitle ?? null,
        ogDescription: data.ogDescription ?? null,
        ogImageId: data.ogImageId ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        metaRobots: data.metaRobots ?? "index,follow",
        faqItems: (data.faqItems ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    await syncPostTaxonomy(tx, created.id, data.categoryIds ?? [], data.tagIds ?? []);
    return created;
  });

  return findBlogPostById(row.id) as Promise<BlogPostDto>;
}

export async function updateBlogPost(id: string, data: BlogPostWriteInput) {
  const existing = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const nextStatus = data.status ?? (existing.status as BlogPostStatus);
  const scheduledAt =
    data.scheduledAt !== undefined ? data.scheduledAt : existing.scheduledAt;
  const publish =
    data.status !== undefined || data.scheduledAt !== undefined
      ? computePublishFields(nextStatus, scheduledAt, existing.publishedAt)
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.blogPost.update({
      where: { id },
      data: {
        ...(data.titleFa !== undefined ? { titleFa: data.titleFa } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.excerpt !== undefined ? { excerpt: data.excerpt } : {}),
        ...(data.excerptFa !== undefined ? { excerptFa: data.excerptFa } : {}),
        ...(data.content !== undefined
          ? { content: data.content as Prisma.InputJsonValue }
          : {}),
        ...(data.coverImageId !== undefined ? { coverImageId: data.coverImageId } : {}),
        ...(data.authorAdminId !== undefined ? { authorAdminId: data.authorAdminId } : {}),
        ...(publish.status !== undefined ? { status: publish.status } : {}),
        ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
        ...(publish.publishedAt !== undefined ? { publishedAt: publish.publishedAt } : {}),
        ...(data.seoTitle !== undefined ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription !== undefined ? { seoDescription: data.seoDescription } : {}),
        ...(data.ogTitle !== undefined ? { ogTitle: data.ogTitle } : {}),
        ...(data.ogDescription !== undefined ? { ogDescription: data.ogDescription } : {}),
        ...(data.ogImageId !== undefined ? { ogImageId: data.ogImageId } : {}),
        ...(data.canonicalUrl !== undefined ? { canonicalUrl: data.canonicalUrl } : {}),
        ...(data.metaRobots !== undefined ? { metaRobots: data.metaRobots } : {}),
        ...(data.faqItems !== undefined
          ? { faqItems: data.faqItems as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    await syncPostTaxonomy(tx, id, data.categoryIds, data.tagIds);
  });

  return findBlogPostById(id);
}

export async function softDeleteBlogPost(id: string) {
  await prisma.blogPost.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function appendBlogPostHistory(input: {
  postId: string;
  snapshot: unknown;
  actorId: string | null;
}) {
  await prisma.blogPostHistory.create({
    data: {
      postId: input.postId,
      snapshot: input.snapshot as Prisma.InputJsonValue,
      actorType: "admin",
      actorId: input.actorId,
    },
  });
}

/** Search posts + products for internal link tool */
export async function searchInternalLinkTargets(q: string, limit = 12) {
  const query = q.trim();
  if (!query) {
    return { posts: [] as Array<{ id: string; titleFa: string; slug: string; href: string }>, products: [] as Array<{ id: string; title: string; slug: string; href: string }> };
  }

  const [posts, products] = await Promise.all([
    prisma.blogPost.findMany({
      where: {
        deletedAt: null,
        OR: [
          { titleFa: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: { id: true, titleFa: true, slug: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
      take: limit,
      select: { id: true, title: true, slug: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    posts: posts.map((p) => ({
      id: p.id,
      titleFa: p.titleFa,
      slug: p.slug,
      href: `/blog/${p.slug}`,
    })),
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      href: `/products/${p.slug}`,
    })),
  };
}
