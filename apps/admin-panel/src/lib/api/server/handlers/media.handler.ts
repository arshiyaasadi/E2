import { z } from "zod";
import { requirePermission } from "@/lib/api/server/auth-guard";
import {
  countMediaUsage,
  findMediaById,
  listMedia,
  mapMediaRow,
  softDeleteMedia,
  updateMedia,
} from "@/lib/db/repositories/media.repository";
import { normalizeMediaFolder } from "@/lib/media/folders";
import { uploadMediaFile } from "@/lib/media/upload.service";
import { uuidSchema } from "@/lib/validation/uuid";
import type { BffContext } from "@/lib/api/server/route-registry";
import type { ApiResponse } from "@/types/api";
import type { MediaDetailDto, MediaDto, MediaListResultDto } from "@/types/domain";

export async function uploadMediaHandler(request: Request): Promise<Response> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) {
    return Response.json(auth.response, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid multipart form" } },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "file field is required" } },
      { status: 400 },
    );
  }

  const folderRaw = typeof formData.get("folder") === "string" ? String(formData.get("folder")) : "general";
  const folder = normalizeMediaFolder(folderRaw);
  const altText = typeof formData.get("altText") === "string" ? String(formData.get("altText")) : null;
  const title = typeof formData.get("title") === "string" ? String(formData.get("title")) : null;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadMediaFile({
      buffer,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      folder,
      altText,
      title,
    });

    const body: ApiResponse<MediaDto> = {
      success: true,
      data: {
        id: result.id,
        storageKey: result.storageKey,
        url: result.url,
        thumbUrl: result.thumbUrl,
        folder: result.folder,
        title: result.title,
        altText: result.altText,
        width: result.width,
        height: result.height,
        mimeType: result.mimeType,
        createdAt: new Date().toISOString(),
      },
    };

    return Response.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json(
      { success: false, error: { code: "UPLOAD_ERROR", message } },
      { status: 400 },
    );
  }
}

export async function getMediaHandler(mediaId: string): Promise<ApiResponse<MediaDetailDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  const media = await findMediaById(mediaId);
  if (!media) {
    return { success: false, error: { code: "NOT_FOUND", message: "Media not found" } };
  }

  const usageCount = await countMediaUsage(mediaId);

  return {
    success: true,
    data: { ...mapMediaRow(media), usageCount },
  };
}

function parseListParams(searchParams: URLSearchParams) {
  const folderParam = searchParams.get("folder");
  return {
    q: searchParams.get("q") ?? undefined,
    mimeType: searchParams.get("mimeType") ?? undefined,
    folder: folderParam ? normalizeMediaFolder(folderParam) : undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined,
  };
}

export async function listMediaHandler(
  searchParams: URLSearchParams,
): Promise<ApiResponse<MediaListResultDto>> {
  const auth = await requirePermission("products.view");
  if (!auth.ok) return auth.response;

  return { success: true, data: await listMedia(parseListParams(searchParams)) };
}

const updateMediaSchema = z
  .object({
    title: z.string().max(200).nullable().optional(),
    altText: z.string().max(200).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

export async function updateMediaHandler(ctx: BffContext): Promise<ApiResponse<MediaDto>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid media id" } };
  }

  const existing = await findMediaById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Media not found" } };
  }

  const parsed = updateMediaSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid payload" },
    };
  }

  const data = await updateMedia(id, parsed.data);
  return { success: true, data };
}

export async function deleteMediaHandler(ctx: BffContext): Promise<ApiResponse<{ ok: true }>> {
  const auth = await requirePermission("products.manage");
  if (!auth.ok) return auth.response;

  const id = ctx.params.id;
  if (!id || !uuidSchema.safeParse(id).success) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid media id" } };
  }

  const existing = await findMediaById(id);
  if (!existing) {
    return { success: false, error: { code: "NOT_FOUND", message: "Media not found" } };
  }

  try {
    await softDeleteMedia(id);
    return { success: true, data: { ok: true } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("in use")) {
      return { success: false, error: { code: "CONFLICT", message: error.message } };
    }
    throw error;
  }
}
