import { NextResponse } from "next/server";
import { isAllowedImageMime, MAX_IMAGE_BYTES } from "@/features/products/schemas";
import { getSessionFromCookies } from "@/lib/api/server/session";
import {
  FileServiceError,
  uploadProductImage,
} from "@/lib/files/file-service-client";
import { upsertMediaRecord } from "@/lib/products/store";
import type { ApiErrorBody, ApiResponse } from "@/types/api";

function errorJson(code: string, message: string, status: number) {
  const body: ApiErrorBody = { success: false, error: { code, message } };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return errorJson("UNAUTHORIZED", "Sign in required", 401);
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
    const uploaded = await uploadProductImage({
      userId: session.sub,
      actorUserId: session.sub,
      ownerRef: "pishe-product",
      bytes,
      contentType: file.type,
      filename: file.name || "photo.jpg",
    });

    const media = await upsertMediaRecord({
      fileId: uploaded.id,
      userId: session.sub,
      mimeType: uploaded.contentType || file.type,
      sizeBytes: uploaded.sizeBytes ?? file.size,
    });

    const body: ApiResponse<{
      fileId: string;
      mimeType: string;
      sizeBytes: number;
      url: string;
    }> = {
      success: true,
      data: {
        fileId: media.fileId,
        mimeType: media.mimeType,
        sizeBytes: media.sizeBytes,
        url: `/api/v1/media/${media.fileId}`,
      },
    };
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof FileServiceError) {
      return errorJson(error.code, error.message, error.status >= 400 ? error.status : 502);
    }
    if (error instanceof Error && error.message.includes("FILE_SERVICE_CLIENT_SECRET")) {
      return errorJson(
        "SERVICE_UNAVAILABLE",
        "File storage is not configured",
        503,
      );
    }
    console.error("[pishe-media-upload]", error);
    return errorJson("INTERNAL_ERROR", "Upload failed", 500);
  }
}
