import { Router } from "express";
import type { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../auth/jwt.js";
import {
  canAccessStore,
  hasPermission,
  type Permission,
} from "../auth/permissions.js";
import { config, type AllowedContentType } from "../config.js";
import {
  getFileById,
  insertPendingFile,
  markAvailable,
  markDeleted,
  toPublicFile,
} from "../db/files.js";
import { pool } from "../db/pool.js";
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
  res.status(status).json({ error: status === 403 ? "forbidden" : "bad_request", message });
}

function assertPermission(
  req: import("express").Request,
  res: import("express").Response,
  permission: Permission,
  storeId: string,
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
  if (!canAccessStore(auth.roles, auth.storeId, storeId)) {
    deny(res, 403, "Store scope mismatch");
    return false;
  }
  return true;
}

function isAllowedType(value: string): value is AllowedContentType {
  return (config.productImage.allowedTypes as readonly string[]).includes(value);
}

function resolveStoreId(
  req: import("express").Request,
  bodyStoreId?: string,
): string | undefined {
  if (req.auth?.roles.includes("platform-super-admin") && bodyStoreId) {
    return bodyStoreId;
  }
  return req.auth?.storeId ?? bodyStoreId;
}

export function filesRouter(s3: S3Client): Router {
  const router = Router();
  router.use(requireAuth);

  router.post("/v1/files/product-images/upload-url", async (req, res) => {
    try {
      const contentType = String(req.body?.contentType ?? "");
      const ownerRef = String(req.body?.ownerRef ?? "draft");
      const storeId = resolveStoreId(req, req.body?.storeId);

      if (!storeId) {
        deny(res, 400, "storeId required (token claim or body for platform-super-admin)");
        return;
      }
      if (!assertPermission(req, res, "file.product_image.upload", storeId)) return;
      if (!isAllowedType(contentType)) {
        deny(res, 400, "Unsupported contentType");
        return;
      }

      const id = randomUUID();
      const objectKey = buildProductImageObjectKey({
        storeId,
        ownerRef,
        fileId: id,
        contentType,
      });

      const row = await insertPendingFile(pool, {
        id,
        storeId,
        ownerRef,
        bucket: config.minio.bucket,
        objectKey,
        contentType,
        createdBy: req.auth!.subject,
      });

      const uploadUrl = await presignPut(s3, objectKey, contentType);
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
      const file = await getFileById(pool, req.params.id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertPermission(req, res, "file.product_image.upload", file.store_id)) return;

      const head = await headObject(s3, file.object_key);
      if (head.contentLength != null && head.contentLength > config.productImage.maxBytes) {
        deny(res, 400, "Object exceeds max size");
        return;
      }

      const updated = await markAvailable(pool, file.id, head.contentLength);
      if (!updated) {
        res.status(409).json({ error: "conflict", message: "File not pending" });
        return;
      }
      res.json({ file: toPublicFile(updated) });
    } catch {
      res.status(502).json({ error: "bad_gateway", message: "Object not found in storage" });
    }
  });

  const multipartFile = upload.single("file") as unknown as import("express").RequestHandler;

  router.post(
    "/v1/files/product-images",
    multipartFile,
    async (req, res) => {
      try {
        const ownerRef = String(req.body?.ownerRef ?? "draft");
        const storeId = resolveStoreId(req, req.body?.storeId);
        if (!storeId) {
          deny(res, 400, "storeId required");
          return;
        }
        if (!assertPermission(req, res, "file.product_image.upload", storeId)) return;

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
          storeId,
          ownerRef,
          fileId: id,
          contentType,
        });

        const row = await insertPendingFile(pool, {
          id,
          storeId,
          ownerRef,
          bucket: config.minio.bucket,
          objectKey,
          contentType,
          createdBy: req.auth!.subject,
        });

        await putObject(s3, objectKey, file.buffer, contentType);
        const updated = await markAvailable(pool, id, file.size);
        res.status(201).json({ file: toPublicFile(updated ?? row) });
      } catch (err) {
        const message = err instanceof Error ? err.message : "proxy upload failed";
        deny(res, 400, message);
      }
    },
  );

  router.get("/v1/files/:id", async (req, res) => {
    const file = await getFileById(pool, req.params.id);
    if (!file || file.status === "deleted") {
      res.status(404).json({ error: "not_found", message: "File not found" });
      return;
    }
    if (!assertPermission(req, res, "file.product_image.read", file.store_id)) return;
    res.json({ file: toPublicFile(file) });
  });

  router.get("/v1/files/:id/download-url", async (req, res) => {
    try {
      const file = await getFileById(pool, req.params.id);
      if (!file || file.status !== "available") {
        res.status(404).json({ error: "not_found", message: "File not available" });
        return;
      }
      if (!assertPermission(req, res, "file.product_image.read", file.store_id)) return;
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

  router.delete("/v1/files/:id", async (req, res) => {
    try {
      const file = await getFileById(pool, req.params.id);
      if (!file || file.status === "deleted") {
        res.status(404).json({ error: "not_found", message: "File not found" });
        return;
      }
      if (!assertPermission(req, res, "file.product_image.delete", file.store_id)) return;
      await deleteObject(s3, file.object_key);
      const updated = await markDeleted(pool, file.id);
      res.json({ file: updated ? toPublicFile(updated) : null });
    } catch {
      res.status(502).json({ error: "bad_gateway", message: "Delete failed" });
    }
  });

  return router;
}
