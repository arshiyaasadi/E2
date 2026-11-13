import type { Pool } from "pg";

export type FileStatus = "pending" | "available" | "deleted";

export type FileRow = {
  id: string;
  user_id: string;
  owner_type: string;
  owner_ref: string;
  kind: string;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: string | null;
  status: FileStatus;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function insertPendingFile(
  pool: Pool,
  row: {
    id: string;
    userId: string;
    ownerRef: string;
    bucket: string;
    objectKey: string;
    contentType: string;
    createdBy: string;
  },
): Promise<FileRow> {
  const result = await pool.query<FileRow>(
    `INSERT INTO files (
      id, user_id, owner_type, owner_ref, kind, bucket, object_key,
      content_type, status, created_by
    ) VALUES ($1,$2,'product',$3,'product_image',$4,$5,$6,'pending',$7)
    RETURNING *`,
    [
      row.id,
      row.userId,
      row.ownerRef,
      row.bucket,
      row.objectKey,
      row.contentType,
      row.createdBy,
    ],
  );
  const file = result.rows[0];
  if (!file) throw new Error("Insert returned no row");
  return file;
}

export async function getFileById(pool: Pool, id: string): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(`SELECT * FROM files WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function markAvailable(
  pool: Pool,
  id: string,
  sizeBytes: number | undefined,
  updatedBy?: string,
): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET status = 'available',
         size_bytes = COALESCE($2, size_bytes),
         updated_by = COALESCE($3, updated_by),
         updated_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, sizeBytes ?? null, updatedBy ?? null],
  );
  return result.rows[0] ?? null;
}

export async function markDeleted(
  pool: Pool,
  id: string,
  updatedBy?: string,
): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET status = 'deleted',
         updated_by = COALESCE($2, updated_by),
         updated_at = now()
     WHERE id = $1 AND status <> 'deleted'
     RETURNING *`,
    [id, updatedBy ?? null],
  );
  return result.rows[0] ?? null;
}

export async function replaceFileObject(
  pool: Pool,
  id: string,
  params: {
    objectKey: string;
    contentType: string;
    sizeBytes: number | null;
    updatedBy: string;
  },
): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET object_key = $2,
         content_type = $3,
         size_bytes = $4,
         status = 'available',
         updated_by = $5,
         updated_at = now()
     WHERE id = $1 AND status IN ('available', 'pending')
     RETURNING *`,
    [
      id,
      params.objectKey,
      params.contentType,
      params.sizeBytes,
      params.updatedBy,
    ],
  );
  return result.rows[0] ?? null;
}

export async function beginReplacePending(
  pool: Pool,
  id: string,
  params: {
    objectKey: string;
    contentType: string;
    updatedBy: string;
  },
): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET object_key = $2,
         content_type = $3,
         size_bytes = NULL,
         status = 'pending',
         updated_by = $4,
         updated_at = now()
     WHERE id = $1 AND status IN ('available', 'pending')
     RETURNING *`,
    [id, params.objectKey, params.contentType, params.updatedBy],
  );
  return result.rows[0] ?? null;
}

export async function patchFileMetadata(
  pool: Pool,
  id: string,
  params: {
    ownerRef?: string;
    updatedBy: string;
  },
): Promise<FileRow | null> {
  if (params.ownerRef === undefined) {
    return getFileById(pool, id);
  }
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET owner_ref = $2,
         updated_by = $3,
         updated_at = now()
     WHERE id = $1 AND status <> 'deleted'
     RETURNING *`,
    [id, params.ownerRef, params.updatedBy],
  );
  return result.rows[0] ?? null;
}

export function toPublicFile(row: FileRow) {
  return {
    id: row.id,
    userId: row.user_id,
    ownerType: row.owner_type,
    ownerRef: row.owner_ref,
    kind: row.kind,
    bucket: row.bucket,
    objectKey: row.object_key,
    contentType: row.content_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
