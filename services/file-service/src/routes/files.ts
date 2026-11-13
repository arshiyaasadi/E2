import { Router } from "express";
import type { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../auth/jwt.js";
import {
  canAccessUser,
  hasPermission,
  type Permission,
} from "../auth/permissions.js";
import { config, type AllowedContentType } from "../config.js";
import { insertAuditEvent, type AuditAction } from "../db/audit.js";
import {
  beginReplacePending,
  getFileById,
  insertPendingFile,
  markAvailable,
  markDeleted,
  patchFileMetadata,
  replaceFileObject,
  toPublicFile,
  type FileRow,
} from "../db/files.js";
import { pool } from "../db/pool.js";
import { log } from "../obs/log.js";
import { buildProductImageObjectKey } from "../storage/keys.js";
import {
  deleteObject,
  headObject,
  presignGet,
  presignPut,
  putObject,
} from "../storage/minio.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.productImage.maxBytes },
});

function deny(res: import("express").Response, status: number, message: string) {
  const error =
    status === 403
      ? "forbidden"
      : status === 401
        ? "unauthorized"
        : "bad_request";
  res.status(status).json({ error, message });
}

function assertPermission(
  req: import("express").Request,
  res: import("express").Response,
  permission: Permission,
): boolean {
  const auth = req.auth;
  if (!auth) {
    deny(res, 401, "Unauthorized");
    return false;
  }
  if (!hasPermission(auth.roles, permission)) {
    deny(res, 403, `Missing permission ${permission}`);
    return false;
  }
  return true;
}

function assertUserScope(
  req: import("express").Request,
  res: import("express").Response,
  requestUserId: string | undefined,
  resourceUserId: string,
): boolean {
  if (!req.auth) {
    deny(res, 401, "Unauthorized");
    return false;
  }
  if (!canAccessUser(req.auth.roles, requestUserId, resourceUserId)) {
    deny(res, 403, "User scope mismatch");
    return false;
  }
  return true;
}

function isAllowedType(value: string): value is AllowedContentType {
  return (config.productImage.allowedTypes as readonly string[]).includes(value);
}

function readUserId(req: import("express").Request): string | undefined {
  const fromBody = req.body?.userId;
  const fromQuery = req.query?.userId;
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery;
  return undefined;
}

function readActorUserId(req: import("express").Request): string | undefined {
  const v = req.body?.actorUserId ?? req.query?.actorUserId;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function fileIdParam(req: import("express").Request): string | undefined {
  const id = req.params.id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

async function audit(
  req: import("express").Request,
  action: AuditAction,
  file: Pick<FileRow, "id" | "user_id">,
  detail?: Record<string, unknown>,
): Promise<void> {
  const clientId = req.auth?.clientId ?? "unknown";
  const actorUserId = readActorUserId(req);
  try {
    await insertAuditEvent(pool, {
      action,
      fileId: file.id,
      userId: file.user_id,
      clientId,
      actorUserId,
      requestId: req.requestId,
      detail,
    });
  } catch (err) {
    log.error("audit_db_failed", {
      action,
      file_id: file.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  log.audit("file_audit", {
    action,
    client_id: clientId,
    user_id: file.user_id,
    file_id: file.id,
    request_id: req.requestId,
    trace_id: req.traceId,
    actor_user_id: actorUserId,
    ...detail,
  });
}

export function filesRouter(s3: S3Client): Router {
  const router = Router();
  // Auth only on API routes — do not intercept unrelated paths (e.g. GET /).
  router.use("/v1/files", requireAuth);

  router.post("/v1/files/product-images/upload-url", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.upload")) return;

      const contentType = String(req.body?.contentType ?? "");
      const ownerRef = String(req.body?.ownerRef ?? "draft");
      const userId = readUserId(req);

      if (!userId) {
        deny(res, 400, "userId required");
        return;
      }
      if (!isAllowedType(contentType)) {
        deny(res, 400, "Unsupported contentType");
        return;
      }

      const id = randomUUID();
      const objectKey = buildProductImageObjectKey({
        userId,
        ownerRef,
        fileId: id,
        contentType,
      });

      const row = await insertPendingFile(pool, {
        id,
        userId,
        ownerRef,
        bucket: config.minio.bucket,
        objectKey,
        contentType,
        createdBy: req.auth!.clientId,
      });

      const uploadUrl = await presignPut(s3, objectKey, contentType);
      await audit(req, "file.upload_url", row, { ownerRef, contentType });

      res.status(201).json({
        file: toPublicFile(row),
        uploadUrl,
        expiresInSeconds: config.productImage.uploadUrlTtlSeconds,
        method: "PUT",
        headers: { "Content-Type": contentType },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "upload-url failed";
      deny(res, 400, message);
    }
  });

  router.post("/v1/files/:id/confirm", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.upload")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const file = await getFileById(pool, id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;

      const head = await headObject(s3, file.object_key);
      if (head.contentLength != null && head.contentLength > config.productImage.maxBytes) {
        deny(res, 400, "Object exceeds max size");
        return;
      }

      const updated = await markAvailable(
        pool,
        file.id,
        head.contentLength,
        req.auth!.clientId,
      );
      if (!updated) {
        res.status(409).json({ error: "conflict", message: "File not pending" });
        return;
      }
      await audit(req, "file.confirm", updated, { sizeBytes: head.contentLength });
      res.json({ file: toPublicFile(updated) });
    } catch {
      res.status(502).json({ error: "bad_gateway", message: "Object not found in storage" });
    }
  });

  const multipartFile = upload.single("file") as unknown as import("express").RequestHandler;

  router.post("/v1/files/product-images", multipartFile, async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.upload")) return;

      const ownerRef = String(req.body?.ownerRef ?? "draft");
      const userId = readUserId(req);
      if (!userId) {
        deny(res, 400, "userId required");
        return;
      }

      const file = req.file;
      if (!file) {
        deny(res, 400, "multipart field 'file' required");
        return;
      }
      const contentType = file.mimetype;
      if (!isAllowedType(contentType)) {
        deny(res, 400, "Unsupported contentType");
        return;
      }
      if (file.size > config.productImage.maxBytes) {
        deny(res, 400, "File exceeds max size");
        return;
      }

      const id = randomUUID();
      const objectKey = buildProductImageObjectKey({
        userId,
        ownerRef,
        fileId: id,
        contentType,
      });

      const row = await insertPendingFile(pool, {
        id,
        userId,
        ownerRef,
        bucket: config.minio.bucket,
        objectKey,
        contentType,
        createdBy: req.auth!.clientId,
      });

      await putObject(s3, objectKey, file.buffer, contentType);
      const updated = await markAvailable(pool, id, file.size, req.auth!.clientId);
      const finalRow = updated ?? row;
      await audit(req, "file.proxy_upload", finalRow, {
        ownerRef,
        contentType,
        sizeBytes: file.size,
      });
      res.status(201).json({ file: toPublicFile(finalRow) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "proxy upload failed";
      deny(res, 400, message);
    }
  });

  router.get("/v1/files/:id", async (req, res) => {
    if (!assertPermission(req, res, "file.product_image.read")) return;

    const id = fileIdParam(req);
    if (!id) {
      deny(res, 400, "file id required");
      return;
    }
    const file = await getFileById(pool, id);
    if (!file || file.status === "deleted") {
      res.status(404).json({ error: "not_found", message: "File not found" });
      return;
    }
    if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;
    res.json({ file: toPublicFile(file) });
  });

  router.get("/v1/files/:id/download-url", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.read")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const file = await getFileById(pool, id);
      if (!file || file.status !== "available") {
        res.status(404).json({ error: "not_found", message: "File not available" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;
      const downloadUrl = await presignGet(s3, file.object_key);
      res.json({
        fileId: file.id,
        downloadUrl,
        expiresInSeconds: config.productImage.downloadUrlTtlSeconds,
      });
    } catch {
      res.status(502).json({ error: "bad_gateway", message: "Could not sign download URL" });
    }
  });

  router.post("/v1/files/:id/replace-url", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.replace")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const file = await getFileById(pool, id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;

      const contentType = String(req.body?.contentType ?? file.content_type);
      if (!isAllowedType(contentType)) {
        deny(res, 400, "Unsupported contentType");
        return;
      }

      const previousKey = file.object_key;
      const objectKey = buildProductImageObjectKey({
        userId: file.user_id,
        ownerRef: file.owner_ref,
        fileId: `${file.id}-r${Date.now()}`,
        contentType,
      });

      const updated = await beginReplacePending(pool, file.id, {
        objectKey,
        contentType,
        updatedBy: req.auth!.clientId,
      });
      if (!updated) {
        res.status(409).json({ error: "conflict", message: "File not replaceable" });
        return;
      }

      // Best-effort remove previous object; soft metadata already points at new key.
      try {
        if (previousKey !== objectKey) {
          await deleteObject(s3, previousKey);
        }
      } catch {
        log.warn("replace_url_old_object_delete_failed", {
          file_id: file.id,
          object_key: previousKey,
        });
      }

      const uploadUrl = await presignPut(s3, objectKey, contentType);
      await audit(req, "file.replace_url", updated, { contentType, previousKey });

      res.status(200).json({
        file: toPublicFile(updated),
        uploadUrl,
        expiresInSeconds: config.productImage.uploadUrlTtlSeconds,
        method: "PUT",
        headers: { "Content-Type": contentType },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "replace-url failed";
      deny(res, 400, message);
    }
  });

  router.put("/v1/files/:id/content", multipartFile, async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.replace")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const existing = await getFileById(pool, id);
      if (!existing || existing.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), existing.user_id)) return;

      const uploaded = req.file;
      if (!uploaded) {
        deny(res, 400, "multipart field 'file' required");
        return;
      }
      const contentType = uploaded.mimetype;
      if (!isAllowedType(contentType)) {
        deny(res, 400, "Unsupported contentType");
        return;
      }
      if (uploaded.size > config.productImage.maxBytes) {
        deny(res, 400, "File exceeds max size");
        return;
      }

      const previousKey = existing.object_key;
      const objectKey = buildProductImageObjectKey({
        userId: existing.user_id,
        ownerRef: existing.owner_ref,
        fileId: `${existing.id}-r${Date.now()}`,
        contentType,
      });

      await putObject(s3, objectKey, uploaded.buffer, contentType);
      const updated = await replaceFileObject(pool, existing.id, {
        objectKey,
        contentType,
        sizeBytes: uploaded.size,
        updatedBy: req.auth!.clientId,
      });
      if (!updated) {
        res.status(409).json({ error: "conflict", message: "File not replaceable" });
        return;
      }

      try {
        if (previousKey !== objectKey) {
          await deleteObject(s3, previousKey);
        }
      } catch {
        log.warn("replace_content_old_object_delete_failed", {
          file_id: existing.id,
          object_key: previousKey,
        });
      }

      await audit(req, "file.replace_content", updated, {
        contentType,
        sizeBytes: uploaded.size,
        previousKey,
      });
      res.json({ file: toPublicFile(updated) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "replace content failed";
      deny(res, 400, message);
    }
  });

  router.patch("/v1/files/:id", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.replace")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const file = await getFileById(pool, id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;

      const ownerRef =
        req.body?.ownerRef !== undefined ? String(req.body.ownerRef) : undefined;
      if (ownerRef === undefined) {
        deny(res, 400, "No patchable fields provided (ownerRef)");
        return;
      }
      // Validate path segment early
      buildProductImageObjectKey({
        userId: file.user_id,
        ownerRef,
        fileId: file.id,
        contentType: file.content_type,
      });

      const updated = await patchFileMetadata(pool, file.id, {
        ownerRef,
        updatedBy: req.auth!.clientId,
      });
      if (!updated) {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      await audit(req, "file.patch_metadata", updated, {
        ownerRef,
        previousOwnerRef: file.owner_ref,
      });
      res.json({ file: toPublicFile(updated) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "patch failed";
      deny(res, 400, message);
    }
  });

  router.delete("/v1/files/:id", async (req, res) => {
    try {
      if (!assertPermission(req, res, "file.product_image.delete")) return;

      const id = fileIdParam(req);
      if (!id) {
        deny(res, 400, "file id required");
        return;
      }
      const file = await getFileById(pool, id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertUserScope(req, res, readUserId(req), file.user_id)) return;

      try {
        await deleteObject(s3, file.object_key);
      } catch {
        log.warn("soft_delete_object_missing", {
          file_id: file.id,
          object_key: file.object_key,
        });
      }
      const updated = await markDeleted(pool, file.id, req.auth!.clientId);
      if (updated) {
        await audit(req, "file.delete", updated, { soft: true });
      }
      res.json({ file: updated ? toPublicFile(updated) : null });
    } catch {
      res.status(502).json({ error: "bad_gateway", message: "Delete failed" });
    }
  });

  return router;
}
