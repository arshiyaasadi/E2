import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  createTag,
  findTagById,
  listTags,
  softDeleteTag,
  tagSlugExists,
  updateTag,
} from "@/lib/db/repositories/tag.repository";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { TagDto } from "@/types/domain";

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  nameFa: z.string().min(1).max(100),
  slug: slugSchema.optional(),
});

const updateTagSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    nameFa: z.string().min(1).max(100).optional(),
    slug: slugSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveUniqueSlug(name: string, provided?: string, excludeId?: string) {
  const base = provided?.trim() || slugify(name);
  if (!base) return null;

  let candidate = base;
  let suffix = 2;
  while (await tagSlugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function listTagsHandler(): Promise<ApiResponse<TagDto[]>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const data = await listTags();
  return { success: true, data };
}

export async function getTagHandler(ctx: BffContext): Promise<ApiResponse<TagDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid tag id" } };
  }

  const data = await findTagById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  }

  return { success: true, data };
}

export async function createTagHandler(body: unknown): Promise<ApiResponse<TagDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const slug = await resolveUniqueSlug(parsed.data.name, parsed.data.slug);
  if (!slug) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Could not generate slug" } };
  }

  try {
    const data = await createTag({
      name: parsed.data.name,
      nameFa: parsed.data.nameFa,
      slug,
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "tag.created",
      entityType: "tag",
      entityId: data.id,
      snapshot: { name: data.name, nameFa: data.nameFa, slug: data.slug },
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateTagHandler(ctx: BffContext): Promise<ApiResponse<TagDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid tag id" } };
  }

  const existing = await findTagById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  }

  const parsed = updateTagSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  let slug = parsed.data.slug;
  if (slug) {
    if (await tagSlugExists(slug, id)) {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
  } else if (parsed.data.name) {
    const nextSlug = await resolveUniqueSlug(parsed.data.name, undefined, id);
    if (nextSlug) slug = nextSlug;
  }

  try {
    const data = await updateTag(id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.nameFa !== undefined ? { nameFa: parsed.data.nameFa } : {}),
      ...(slug !== undefined ? { slug } : {}),
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "tag.updated",
      entityType: "tag",
      entityId: data.id,
      snapshot: { name: data.name, nameFa: data.nameFa, slug: data.slug },
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function deleteTagHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid tag id" } };
  }

  const existing = await findTagById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Tag not found" } };
  }

  await softDeleteTag(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "tag.deleted",
    entityType: "tag",
    entityId: id,
    snapshot: { name: existing.name, nameFa: existing.nameFa, slug: existing.slug },
  });
  return { success: true, data: { ok: true } };
}
