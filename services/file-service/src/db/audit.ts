import type { Pool } from "pg";

export type AuditAction =
  | "file.upload_url"
  | "file.confirm"
  | "file.proxy_upload"
  | "file.replace_url"
  | "file.replace_content"
  | "file.patch_metadata"
  | "file.delete";

export async function insertAuditEvent(
  pool: Pool,
  event: {
    action: AuditAction;
    fileId?: string;
    userId: string;
    clientId: string;
    actorUserId?: string;
    requestId?: string;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO file_audit_events (
      action, file_id, user_id, client_id, actor_user_id, request_id, detail
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      event.action,
      event.fileId ?? null,
      event.userId,
      event.clientId,
      event.actorUserId ?? null,
      event.requestId ?? null,
      JSON.stringify(event.detail ?? {}),
    ],
  );
}
