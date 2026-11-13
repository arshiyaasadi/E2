import { z } from "zod";
import type {
  BrandListItem,
  CategoryListItem,
} from "@/features/products/types";
import { getSessionFromCookies } from "@/lib/api/server/session";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  getBrandForUser,
  getCategoryForUser,
  listBrandsForUser,
  listCategoriesForUser,
  listMediaForUser,
  updateBrand,
  updateCategory,
} from "@/lib/products/store";
import type { ApiResponse } from "@/types/api";

function unauthorized(): ApiResponse<never> {
  return {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Sign in required" },
  };
}

function mediaUrl(fileId: string | null) {
  return fileId ? `/api/v1/media/${fileId}` : null;
}

const brandBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional().default(""),
  imageId: z.string().uuid().nullable().optional(),
});

const brandPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().trim().max(1000).optional(),
    imageId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

const categoryBodySchema = z.object({
  name: z.string().trim().min(1).max(150),
  kind: z.enum(["real", "virtual"]),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(2000).optional().default(""),
  imageId: z.string().uuid().nullable().optional(),
});

const categoryPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(150).optional(),
    parentId: z.string().uuid().nullable().optional(),
    description: z.string().trim().max(2000).optional(),
    imageId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

function toBrandItem(brand: Awaited<ReturnType<typeof createBrand>>): BrandListItem {
  return { ...brand, imageUrl: mediaUrl(brand.imageId) };
}

function toCategoryItem(
  category: Awaited<ReturnType<typeof createCategory>>,
  parentName: string | null,
): CategoryListItem {
  return {
    ...category,
    imageUrl: mediaUrl(category.imageId),
    parentName,
  };
}

export async function listBrandsHandler(): Promise<
  ApiResponse<BrandListItem[]>
> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const brands = await listBrandsForUser(session.sub);
  return { success: true, data: brands.map(toBrandItem) };
}

export async function getBrandHandler(
  brandId: string,
): Promise<ApiResponse<BrandListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const brand = await getBrandForUser(session.sub, brandId);
  if (!brand) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Brand not found" },
    };
  }
  return { success: true, data: toBrandItem(brand) };
}

export async function createBrandHandler(
  body: unknown,
): Promise<ApiResponse<BrandListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const parsed = brandBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }
  const brand = await createBrand({
    userId: session.sub,
    name: parsed.data.name,
    description: parsed.data.description,
    imageId: parsed.data.imageId ?? null,
  });
  return { success: true, data: toBrandItem(brand) };
}

export async function patchBrandHandler(
  brandId: string,
  body: unknown,
): Promise<ApiResponse<BrandListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const parsed = brandPatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }
  const brand = await updateBrand(session.sub, brandId, parsed.data);
  if (!brand) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Brand not found" },
    };
  }
  return { success: true, data: toBrandItem(brand) };
}

export async function deleteBrandHandler(
  brandId: string,
): Promise<ApiResponse<{ id: string }>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const brand = await deleteBrand(session.sub, brandId);
  if (!brand) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Brand not found" },
    };
  }
  return { success: true, data: { id: brand.id } };
}

export async function listCategoriesHandler(): Promise<
  ApiResponse<CategoryListItem[]>
> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const categories = await listCategoriesForUser(session.sub);
  const byId = new Map(categories.map((c) => [c.id, c]));
  return {
    success: true,
    data: categories.map((c) =>
      toCategoryItem(c, c.parentId ? (byId.get(c.parentId)?.name ?? null) : null),
    ),
  };
}

export async function getCategoryHandler(
  categoryId: string,
): Promise<ApiResponse<CategoryListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const category = await getCategoryForUser(session.sub, categoryId);
  if (!category) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Category not found" },
    };
  }
  const parent = category.parentId
    ? await getCategoryForUser(session.sub, category.parentId)
    : null;
  return {
    success: true,
    data: toCategoryItem(category, parent?.name ?? null),
  };
}

export async function createCategoryHandler(
  body: unknown,
): Promise<ApiResponse<CategoryListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const parsed = categoryBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }
  try {
    const category = await createCategory({
      userId: session.sub,
      name: parsed.data.name,
      kind: parsed.data.kind,
      parentId: parsed.data.parentId ?? null,
      description: parsed.data.description,
      imageId: parsed.data.imageId ?? null,
    });
    const parent = category.parentId
      ? await getCategoryForUser(session.sub, category.parentId)
      : null;
    return {
      success: true,
      data: toCategoryItem(category, parent?.name ?? null),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    };
  }
}

export async function patchCategoryHandler(
  categoryId: string,
  body: unknown,
): Promise<ApiResponse<CategoryListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const parsed = categoryPatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }
  try {
    const category = await updateCategory(session.sub, categoryId, parsed.data);
    if (!category) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Category not found" },
      };
    }
    const parent = category.parentId
      ? await getCategoryForUser(session.sub, category.parentId)
      : null;
    return {
      success: true,
      data: toCategoryItem(category, parent?.name ?? null),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    };
  }
}

export async function deleteCategoryHandler(
  categoryId: string,
): Promise<ApiResponse<{ id: string }>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const category = await deleteCategory(session.sub, categoryId);
  if (!category) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Category not found" },
    };
  }
  return { success: true, data: { id: category.id } };
}

export async function listMediaLibraryHandler(): Promise<
  ApiResponse<
    {
      fileId: string;
      url: string;
      mimeType: string;
      sizeBytes: number;
      productCount: number;
      updatedAt: string;
    }[]
  >
> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();
  const media = await listMediaForUser(session.sub);
  return {
    success: true,
    data: media.map((m) => ({
      fileId: m.fileId,
      url: `/api/v1/media/${m.fileId}`,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      productCount: m.productIds.length,
      updatedAt: m.updatedAt,
    })),
  };
}
