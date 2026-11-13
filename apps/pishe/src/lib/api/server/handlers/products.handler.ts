import {
  productPatchSchema,
  stage1CreateSchema,
} from "@/features/products/schemas";
import type {
  DashboardStats,
  ProductListItem,
  ProductRecord,
} from "@/features/products/types";
import { getSessionFromCookies } from "@/lib/api/server/session";
import { softDeleteProductImage } from "@/lib/files/file-service-client";
import {
  createProduct,
  deleteProduct,
  getBrandForUser,
  getCategoryForUser,
  getProductForUser,
  listProductsForUser,
  productsUsingMedia,
  updateProduct,
} from "@/lib/products/store";
import type { ApiResponse } from "@/types/api";

function unauthorized(): ApiResponse<never> {
  return {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Sign in required" },
  };
}

function mediaUrl(fileId: string) {
  return `/api/v1/media/${fileId}`;
}

async function toListItem(
  userId: string,
  product: ProductRecord,
): Promise<ProductListItem> {
  const coverId = product.mediaIds[0] ?? null;
  const brand = product.brandId
    ? await getBrandForUser(userId, product.brandId)
    : null;
  const category = product.categoryId
    ? await getCategoryForUser(userId, product.categoryId)
    : null;
  return {
    ...product,
    coverUrl: coverId ? mediaUrl(coverId) : null,
    photoCount: product.mediaIds.length,
    brandName: brand?.name ?? null,
    categoryName: category?.name ?? null,
  };
}

function computeStats(products: ProductRecord[]): DashboardStats {
  const total = products.length;
  const basicCount = products.filter((p) => p.status === "basic").length;
  if (total === 0) {
    return { total: 0, basicCount: 0, averagePriceToman: null };
  }
  const sumRial = products.reduce((acc, p) => acc + p.priceRial, 0);
  return {
    total,
    basicCount,
    averagePriceToman: Math.round(sumRial / total / 10),
  };
}

export async function listProductsHandler(): Promise<
  ApiResponse<{ products: ProductListItem[]; stats: DashboardStats }>
> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const products = await listProductsForUser(session.sub);
  return {
    success: true,
    data: {
      products: await Promise.all(
        products.map((p) => toListItem(session.sub, p)),
      ),
      stats: computeStats(products),
    },
  };
}

export async function getProductHandler(
  productId: string,
): Promise<ApiResponse<ProductListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const product = await getProductForUser(session.sub, productId);
  if (!product) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Product not found" },
    };
  }

  return { success: true, data: await toListItem(session.sub, product) };
}

export async function createProductHandler(
  body: unknown,
): Promise<ApiResponse<ProductListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const parsed = stage1CreateSchema.safeParse(body);
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
    const product = await createProduct({
      userId: session.sub,
      title: parsed.data.title,
      priceRial: parsed.data.priceRial ?? 0,
      description: parsed.data.description ?? "",
      mediaIds: parsed.data.mediaIds,
      brandId: parsed.data.brandId ?? null,
      categoryId: parsed.data.categoryId ?? null,
      groupCategoryIds: parsed.data.groupCategoryIds ?? [],
    });
    return { success: true, data: await toListItem(session.sub, product) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    };
  }
}

export async function patchProductHandler(
  productId: string,
  body: unknown,
): Promise<ApiResponse<ProductListItem>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const parsed = productPatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
    };
  }

  const existing = await getProductForUser(session.sub, productId);
  if (!existing) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Product not found" },
    };
  }

  const data = parsed.data;

  if (data.variants) {
    const activeRows = data.variants.rows.filter((r) => r.active);
    if (data.variants.rows.length > 0 && activeRows.length === 0) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "At least one variant must remain active",
        },
      };
    }
    if (data.variants.attr1.values.length === 0 && data.variants.attr1.kind !== "none") {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Add at least one value for attribute 1",
        },
      };
    }
    if (
      data.variants.attr2 &&
      data.variants.attr2.kind !== "none" &&
      data.variants.attr2.values.length === 0
    ) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Add at least one value for attribute 2",
        },
      };
    }
  }

  let nextStatus = existing.status;
  if (data.complete === true) {
    nextStatus = "complete";
  }

  try {
    const product = await updateProduct(session.sub, productId, {
      title: data.title,
      priceRial: data.priceRial,
      description: data.description,
      mediaIds: data.mediaIds,
      brandId: data.brandId,
      categoryId: data.categoryId,
      groupCategoryIds: data.groupCategoryIds,
      unit: data.unit,
      variants: data.variants
        ? {
            attr1: data.variants.attr1,
            attr2: data.variants.attr2,
            rows: data.variants.rows.filter((r) => r.active),
          }
        : undefined,
      status: nextStatus,
    });

    if (!product) {
      return {
        success: false,
        error: { code: "NOT_FOUND", message: "Product not found" },
      };
    }

    return { success: true, data: await toListItem(session.sub, product) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    };
  }
}

export async function deleteProductHandler(
  productId: string,
): Promise<ApiResponse<{ id: string }>> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const result = await deleteProduct(session.sub, productId);
  if (!result) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: "Product not found" },
    };
  }

  for (const fileId of result.orphanedFileIds) {
    try {
      await softDeleteProductImage({
        fileId,
        userId: session.sub,
        actorUserId: session.sub,
      });
    } catch (error) {
      console.error("[pishe-products] orphan file delete failed", fileId, error);
    }
  }

  return { success: true, data: { id: productId } };
}

export async function mediaUsageHandler(
  fileId: string,
): Promise<
  ApiResponse<{ fileId: string; products: { id: string; title: string }[] }>
> {
  const session = await getSessionFromCookies();
  if (!session) return unauthorized();

  const products = await productsUsingMedia(session.sub, fileId);
  return {
    success: true,
    data: {
      fileId,
      products: products.map((p) => ({ id: p.id, title: p.title })),
    },
  };
}
