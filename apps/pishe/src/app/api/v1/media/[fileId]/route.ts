import { NextResponse } from "next/server";
import { isAllowedImageMime, MAX_IMAGE_BYTES } from "@/features/products/schemas";
import { getSessionFromCookies } from "@/lib/api/server/session";
import {
  fetchPresignedBytes,
  FileServiceError,
  getDownloadUrl,
  replaceProductImage,
  softDeleteProductImage,
} from "@/lib/files/file-service-client";
import {
  getMediaForUser,
  getProductForUser,
  productsUsingMedia,
  remapMediaFileId,
  removeMediaRecord,
  updateProduct,
  upsertMediaRecord,
} from "@/lib/products/store";
import type { ApiErrorBody, ApiResponse } from "@/types/api";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

function errorJson(code: string, message: string, status: number) {
  const body: ApiErrorBody = { success: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorJson("UNAUTHORIZED", "Sign in required", 401);
  }

  const { fileId } = await context.params;
  const media = await getMediaForUser(session.sub, fileId);
  if (!media) {
    return errorJson("NOT_FOUND", "Media not found", 404);
  }

  try {
    const { downloadUrl } = await getDownloadUrl({
      fileId,
      userId: session.sub,
    });
    const { body, contentType } = await fetchPresignedBytes(downloadUrl);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType || media.mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    if (error instanceof FileServiceError) {
      return errorJson(error.code, error.message, error.status >= 400 ? error.status : 502);
    }
    console.error("[pishe-media-get]", error);
    return errorJson("INTERNAL_ERROR", "Could not load image", 500);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorJson("UNAUTHORIZED", "Sign in required", 401);
  }

  const { fileId } = await context.params;
  const media = await getMediaForUser(session.sub, fileId);
  if (!media) {
    return errorJson("NOT_FOUND", "Media not found", 404);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorJson("VALIDATION_ERROR", "Expected multipart form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorJson("VALIDATION_ERROR", "file field is required", 400);
  }
  if (!isAllowedImageMime(file.type)) {
    return errorJson(
      "VALIDATION_ERROR",
      "Only jpeg, png, and webp images are allowed",
      400,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return errorJson("VALIDATION_ERROR", "Image exceeds 5MB", 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const linkedBefore = await productsUsingMedia(session.sub, fileId);
    const uploaded = await replaceProductImage({
      fileId,
      userId: session.sub,
      actorUserId: session.sub,
      bytes,
      contentType: file.type,
      filename: file.name || "photo.jpg",
    });

    let resultFileId = fileId;
    if (uploaded.replacedInPlace) {
      await upsertMediaRecord({
        fileId,
        userId: session.sub,
        mimeType: uploaded.contentType || file.type,
        sizeBytes: uploaded.sizeBytes ?? file.size,
      });
    } else {
      resultFileId = uploaded.id;
      await remapMediaFileId({
        userId: session.sub,
        fromFileId: fileId,
        toFileId: uploaded.id,
        mimeType: uploaded.contentType || file.type,
        sizeBytes: uploaded.sizeBytes ?? file.size,
      });
      try {
        await softDeleteProductImage({
          fileId,
          userId: session.sub,
          actorUserId: session.sub,
        });
      } catch (err) {
        console.error("[pishe-media-replace] old file delete failed", err);
      }
    }

    const body: ApiResponse<{
      fileId: string;
      mimeType: string;
      sizeBytes: number;
      url: string;
      affectedProducts: { id: string; title: string }[];
    }> = {
      success: true,
      data: {
        fileId: resultFileId,
        mimeType: uploaded.contentType || file.type,
        sizeBytes: uploaded.sizeBytes ?? file.size,
        url: `/api/v1/media/${resultFileId}`,
        affectedProducts: linkedBefore.map((p) => ({ id: p.id, title: p.title })),
      },
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof FileServiceError) {
      return errorJson(error.code, error.message, error.status >= 400 ? error.status : 502);
    }
    console.error("[pishe-media-replace]", error);
    return errorJson("INTERNAL_ERROR", "Replace failed", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorJson("UNAUTHORIZED", "Sign in required", 401);
  }

  const { fileId } = await context.params;
  const media = await getMediaForUser(session.sub, fileId);
  if (!media) {
    return errorJson("NOT_FOUND", "Media not found", 404);
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return errorJson("VALIDATION_ERROR", "productId query is required", 400);
  }

  const product = await getProductForUser(session.sub, productId);
  if (!product) {
    return errorJson("NOT_FOUND", "Product not found", 404);
  }
  if (!product.mediaIds.includes(fileId)) {
    return errorJson("VALIDATION_ERROR", "Photo is not on this product", 400);
  }
  if (product.mediaIds.length <= 1) {
    return errorJson(
      "VALIDATION_ERROR",
      "At least one photo must remain on the product",
      400,
    );
  }

  const linked = await productsUsingMedia(session.sub, fileId);
  const confirmAll = url.searchParams.get("confirmAll") === "true";
  if (linked.length > 1 && !confirmAll) {
    return errorJson(
      "CONFLICT",
      `This photo is used by ${linked.length} products`,
      409,
    );
  }

  try {
    // Remove from this product (or all linked products when confirmAll).
    const targets = confirmAll ? linked : [product];
    for (const target of targets) {
      const nextIds = target.mediaIds.filter((id) => id !== fileId);
      await updateProduct(session.sub, target.id, { mediaIds: nextIds });
    }

    const remaining = await productsUsingMedia(session.sub, fileId);
    if (remaining.length === 0) {
      await softDeleteProductImage({
        fileId,
        userId: session.sub,
        actorUserId: session.sub,
      });
      await removeMediaRecord(session.sub, fileId);
    }

    const body: ApiResponse<{ fileId: string }> = {
      success: true,
      data: { fileId },
    };
    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof FileServiceError) {
      return errorJson(error.code, error.message, error.status >= 400 ? error.status : 502);
    }
    console.error("[pishe-media-delete]", error);
    return errorJson("INTERNAL_ERROR", "Delete failed", 500);
  }
}
