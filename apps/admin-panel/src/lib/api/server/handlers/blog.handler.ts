import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  appendBlogPostHistory,
  blogCategorySlugExists,
  blogPostSlugExists,
  blogTagSlugExists,
  createBlogCategory,
  createBlogPost,
  createBlogTag,
  findBlogCategoryById,
  findBlogPostById,
  findBlogTagById,
  listBlogCategories,
  listBlogPosts,
  listBlogTags,
  searchInternalLinkTargets,
  softDeleteBlogCategory,
  softDeleteBlogPost,
  softDeleteBlogTag,
  updateBlogCategory,
  updateBlogPost,
  updateBlogTag,
} from "@/lib/db/repositories/blog.repository";
import {
  createBlogCategorySchema,
  createBlogPostSchema,
  createBlogTagSchema,
  emptyTipTapDoc,
  patchBlogPostSchema,
  updateBlogCategorySchema,
  updateBlogPostSchema,
  updateBlogTagSchema,
} from "@/features/blog/schema";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type {
  BlogCategoryDto,
  BlogPostDto,
  BlogPostListItemDto,
  BlogTagDto,
} from "@/types/domain";

function validationError(message: string): ApiResponse<never> {
  return { success: false, error: { code: "VALIDATION_ERROR", message } };
}

function parseScheduledAt(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function listBlogCategoriesHandler(): Promise<ApiResponse<BlogCategoryDto[]>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  return { success: true, data: await listBlogCategories() };
}

export async function getBlogCategoryHandler(ctx: BffContext): Promise<ApiResponse<BlogCategoryDto>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid category id");
  const data = await findBlogCategoryById(id);
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  return { success: true, data };
}

export async function createBlogCategoryHandler(body: unknown): Promise<ApiResponse<BlogCategoryDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const parsed = createBlogCategorySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  if (await blogCategorySlugExists(parsed.data.slug)) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  try {
    const data = await createBlogCategory(parsed.data);
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "blog_category.created",
      entityType: "blog_category",
      entityId: data.id,
      snapshot: data as unknown as Record<string, unknown>,
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateBlogCategoryHandler(ctx: BffContext): Promise<ApiResponse<BlogCategoryDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid category id");
  const parsed = updateBlogCategorySchema.safeParse(ctx.body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  const existing = await findBlogCategoryById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  if (parsed.data.slug && (await blogCategorySlugExists(parsed.data.slug, id))) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  const data = await updateBlogCategory(id, parsed.data);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_category.updated",
    entityType: "blog_category",
    entityId: id,
    snapshot: data as unknown as Record<string, unknown>,
  });
  return { success: true, data };
}

export async function deleteBlogCategoryHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid category id");
  const existing = await findBlogCategoryById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Category not found" } };
  await softDeleteBlogCategory(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_category.deleted",
    entityType: "blog_category",
    entityId: id,
    snapshot: existing as unknown as Record<string, unknown>,
  });
  return { success: true, data: { ok: true } };
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listBlogTagsHandler(): Promise<ApiResponse<BlogTagDto[]>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  return { success: true, data: await listBlogTags() };
}

export async function getBlogTagHandler(ctx: BffContext): Promise<ApiResponse<BlogTagDto>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid tag id");
  const data = await findBlogTagById(id);
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  return { success: true, data };
}

export async function createBlogTagHandler(body: unknown): Promise<ApiResponse<BlogTagDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const parsed = createBlogTagSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  if (await blogTagSlugExists(parsed.data.slug)) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  try {
    const data = await createBlogTag(parsed.data);
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "blog_tag.created",
      entityType: "blog_tag",
      entityId: data.id,
      snapshot: data as unknown as Record<string, unknown>,
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateBlogTagHandler(ctx: BffContext): Promise<ApiResponse<BlogTagDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid tag id");
  const parsed = updateBlogTagSchema.safeParse(ctx.body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  const existing = await findBlogTagById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  if (parsed.data.slug && (await blogTagSlugExists(parsed.data.slug, id))) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  const data = await updateBlogTag(id, parsed.data);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_tag.updated",
    entityType: "blog_tag",
    entityId: id,
    snapshot: data as unknown as Record<string, unknown>,
  });
  return { success: true, data };
}

export async function deleteBlogTagHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid tag id");
  const existing = await findBlogTagById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  await softDeleteBlogTag(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_tag.deleted",
    entityType: "blog_tag",
    entityId: id,
    snapshot: existing as unknown as Record<string, unknown>,
  });
  return { success: true, data: { ok: true } };
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function listBlogPostsHandler(ctx: BffContext): Promise<ApiResponse<BlogPostListItemDto[]>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const sp = ctx.searchParams ?? new URLSearchParams();
  const status = sp.get("status");
  const statusParsed = z.enum(["draft", "pending", "published"]).safeParse(status);
  const data = await listBlogPosts({
    status: statusParsed.success ? statusParsed.data : undefined,
    categoryId: sp.get("categoryId") ?? undefined,
    q: sp.get("q") ?? undefined,
  });
  return { success: true, data };
}

export async function getBlogPostHandler(ctx: BffContext): Promise<ApiResponse<BlogPostDto>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid post id");
  const data = await findBlogPostById(id);
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  return { success: true, data };
}

export async function previewBlogPostHandler(ctx: BffContext): Promise<ApiResponse<BlogPostDto>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid post id");
  const data = await findBlogPostById(id);
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  return { success: true, data };
}

function mapPostBody(parsed: z.infer<typeof createBlogPostSchema> | z.infer<typeof patchBlogPostSchema>) {
  return {
    titleFa: parsed.titleFa,
    title: emptyToNull(parsed.title ?? undefined),
    slug: parsed.slug,
    excerpt: emptyToNull(parsed.excerpt ?? undefined),
    excerptFa: emptyToNull(parsed.excerptFa ?? undefined),
    content: parsed.content ?? { ...emptyTipTapDoc },
    coverImageId: parsed.coverImageId,
    status: parsed.status,
    scheduledAt: parseScheduledAt(parsed.scheduledAt),
    categoryIds: parsed.categoryIds,
    tagIds: parsed.tagIds,
    faqItems: parsed.faqItems,
    seoTitle: emptyToNull(parsed.seoTitle ?? undefined),
    seoDescription: emptyToNull(parsed.seoDescription ?? undefined),
    ogTitle: emptyToNull(parsed.ogTitle ?? undefined),
    ogDescription: emptyToNull(parsed.ogDescription ?? undefined),
    ogImageId: parsed.ogImageId,
    canonicalUrl: emptyToNull(parsed.canonicalUrl ?? undefined),
    metaRobots: parsed.metaRobots,
  };
}

export async function createBlogPostHandler(body: unknown): Promise<ApiResponse<BlogPostDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const parsed = createBlogPostSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  if (await blogPostSlugExists(parsed.data.slug)) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  const mapped = mapPostBody(parsed.data);
  if (mapped.scheduledAt === undefined && parsed.data.scheduledAt !== undefined) {
    return validationError("Invalid scheduledAt");
  }
  try {
    const data = await createBlogPost({
      titleFa: parsed.data.titleFa,
      slug: parsed.data.slug,
      title: mapped.title,
      excerpt: mapped.excerpt,
      excerptFa: mapped.excerptFa,
      content: mapped.content,
      coverImageId: mapped.coverImageId,
      status: mapped.status,
      scheduledAt: mapped.scheduledAt ?? null,
      categoryIds: mapped.categoryIds,
      tagIds: mapped.tagIds,
      faqItems: mapped.faqItems,
      seoTitle: mapped.seoTitle,
      seoDescription: mapped.seoDescription,
      ogTitle: mapped.ogTitle,
      ogDescription: mapped.ogDescription,
      ogImageId: mapped.ogImageId,
      canonicalUrl: mapped.canonicalUrl,
      metaRobots: mapped.metaRobots,
      authorAdminId: auth.session.sub,
    });
    await appendBlogPostHistory({
      postId: data.id,
      snapshot: data as unknown as Record<string, unknown>,
      actorId: auth.session.sub,
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "blog_post.created",
      entityType: "blog_post",
      entityId: data.id,
      snapshot: { titleFa: data.titleFa, slug: data.slug, status: data.status },
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateBlogPostHandler(ctx: BffContext): Promise<ApiResponse<BlogPostDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid post id");
  const parsed = updateBlogPostSchema.safeParse(ctx.body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  const existing = await findBlogPostById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  if (parsed.data.slug && (await blogPostSlugExists(parsed.data.slug, id))) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  const mapped = mapPostBody(parsed.data);
  if (parsed.data.scheduledAt !== undefined && mapped.scheduledAt === undefined) {
    return validationError("Invalid scheduledAt");
  }
  const data = await updateBlogPost(id, {
    ...mapped,
    scheduledAt: mapped.scheduledAt,
  });
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  await appendBlogPostHistory({ postId: id, snapshot: data as unknown as Record<string, unknown>, actorId: auth.session.sub });
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_post.updated",
    entityType: "blog_post",
    entityId: id,
    snapshot: { titleFa: data.titleFa, slug: data.slug, status: data.status },
  });
  return { success: true, data };
}

export async function patchBlogPostHandler(ctx: BffContext): Promise<ApiResponse<BlogPostDto>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid post id");
  const parsed = patchBlogPostSchema.safeParse(ctx.body);
  if (!parsed.success) return validationError(parsed.error.issues[0]?.message ?? "Invalid payload");
  const existing = await findBlogPostById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  if (parsed.data.slug && (await blogPostSlugExists(parsed.data.slug, id))) {
    return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
  }
  const mapped = mapPostBody(parsed.data);
  if (parsed.data.scheduledAt !== undefined && mapped.scheduledAt === undefined) {
    return validationError("Invalid scheduledAt");
  }
  const data = await updateBlogPost(id, {
    ...mapped,
    scheduledAt: mapped.scheduledAt,
  });
  if (!data) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  return { success: true, data };
}

export async function deleteBlogPostHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("blog.manage");
  if (!auth.ok) return auth.response;
  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) return validationError("Invalid post id");
  const existing = await findBlogPostById(id);
  if (!existing) return { success: false, error: { code: "NOT_FOUND", message: "Post not found" } };
  await softDeleteBlogPost(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "blog_post.deleted",
    entityType: "blog_post",
    entityId: id,
    snapshot: { titleFa: existing.titleFa, slug: existing.slug },
  });
  return { success: true, data: { ok: true } };
}

export async function searchBlogInternalLinksHandler(
  ctx: BffContext,
): Promise<ApiResponse<Awaited<ReturnType<typeof searchInternalLinkTargets>>>> {
  const auth = await requirePermission("blog.view");
  if (!auth.ok) return auth.response;
  const q = ctx.searchParams?.get("q") ?? "";
  const data = await searchInternalLinkTargets(q);
  return { success: true, data };
}
