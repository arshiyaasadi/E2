import { Prisma } from "@prisma/client";
import { z } from "zod";
import { logCatalogAudit } from "@/lib/audit/catalog-audit";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  brandSlugExists,
  createBrand,
  findBrandById,
  listBrands,
  softDeleteBrand,
  updateBrand,
} from "@/lib/db/repositories/brand.repository";
import { optionalUuidSchema, uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { BrandDto } from "@/types/domain";

const slugSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const createBrandSchema = z.object({
  name: z.string().min(1).max(150),
  nameFa: z.string().min(1).max(150),
  slug: slugSchema.optional(),
  imageId: z.union([optionalUuidSchema, z.null()]).optional(),
});

const updateBrandSchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    nameFa: z.string().min(1).max(150).optional(),
    slug: slugSchema.optional(),
    imageId: z.union([optionalUuidSchema, z.null()]).optional(),
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
  while (await brandSlugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function brandAuditSnapshot(brand: BrandDto | null) {
  if (!brand) return null;
  return {
    name: brand.name,
    nameFa: brand.nameFa,
    slug: brand.slug,
    imageId: brand.imageId,
  };
}

export async function listBrandsHandler(): Promise<ApiResponse<BrandDto[]>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const data = await listBrands();
  return { success: true, data };
}

export async function getBrandHandler(ctx: BffContext): Promise<ApiResponse<BrandDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid brand id" } };
  }

  const data = await findBrandById(id);
  if (!data) {
    return { success: false, error: { code: "NOT_FOUND", message: "Brand not found" } };
  }

  return { success: true, data };
}

export async function createBrandHandler(body: unknown): Promise<ApiResponse<BrandDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const parsed = createBrandSchema.safeParse(body);
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
    const data = await createBrand({
      name: parsed.data.name,
      nameFa: parsed.data.nameFa,
      slug,
      imageId: parsed.data.imageId ?? null,
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "brand.created",
      entityType: "brand",
      entityId: data.id,
      snapshot: brandAuditSnapshot(data),
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function updateBrandHandler(ctx: BffContext): Promise<ApiResponse<BrandDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid brand id" } };
  }

  const existing = await findBrandById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Brand not found" } };
  }

  const parsed = updateBrandSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  let slug = parsed.data.slug;
  if (slug) {
    if (await brandSlugExists(slug, id)) {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
  } else if (parsed.data.name && parsed.data.name !== existing.name) {
    const nextSlug = await resolveUniqueSlug(parsed.data.name, undefined, id);
    if (nextSlug) slug = nextSlug;
  }

  try {
    const data = await updateBrand(id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.nameFa !== undefined ? { nameFa: parsed.data.nameFa } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(parsed.data.imageId !== undefined ? { imageId: parsed.data.imageId } : {}),
    });
    await logCatalogAudit({
      actorId: auth.session.sub,
      action: "brand.updated",
      entityType: "brand",
      entityId: data.id,
      snapshot: {
        before: brandAuditSnapshot(existing),
        after: brandAuditSnapshot(data),
      },
    });
    return { success: true, data };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: { code: "CONFLICT", message: "Slug already exists" } };
    }
    throw error;
  }
}

export async function deleteBrandHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid brand id" } };
  }

  const existing = await findBrandById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Brand not found" } };
  }

  await softDeleteBrand(id);
  await logCatalogAudit({
    actorId: auth.session.sub,
    action: "brand.deleted",
    entityType: "brand",
    entityId: id,
    snapshot: brandAuditSnapshot(existing),
  });
  return { success: true, data: { ok: true } };
}
