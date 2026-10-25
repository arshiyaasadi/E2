import type { Pool } from "pg";

export type FileStatus = "pending" | "available" | "deleted";

export type FileRow = {
  id: string;
  store_id: string;
  owner_type: string;
  owner_ref: string;
  kind: string;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: string | null;
  status: FileStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export async function insertPendingFile(
  pool: Pool,
  row: {
    id: string;
    storeId: string;
    ownerRef: string;
    bucket: string;
    objectKey: string;
    contentType: string;
    createdBy: string;
  },
): Promise<FileRow> {
  const result = await pool.query<FileRow>(
    `INSERT INTO files (
      id, store_id, owner_type, owner_ref, kind, bucket, object_key,
      content_type, status, created_by
    ) VALUES ($1,$2,'product',$3,'product_image',$4,$5,$6,'pending',$7)
    RETURNING *`,
    [
      row.id,
      row.storeId,
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
): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET status = 'available',
         size_bytes = COALESCE($2, size_bytes),
         updated_at = now()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id, sizeBytes ?? null],
  );
  return result.rows[0] ?? null;
}

export async function markDeleted(pool: Pool, id: string): Promise<FileRow | null> {
  const result = await pool.query<FileRow>(
    `UPDATE files
     SET status = 'deleted', updated_at = now()
     WHERE id = $1 AND status <> 'deleted'
     RETURNING *`,
    [id],
  );
  return result.rows[0] ?? null;
}

export function toPublicFile(row: FileRow) {
  return {
    id: row.id,
    storeId: row.store_id,
    ownerType: row.owner_type,
    ownerRef: row.owner_ref,
    kind: row.kind,
    bucket: row.bucket,
    objectKey: row.object_key,
    contentType: row.content_type,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
