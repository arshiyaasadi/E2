import { prisma } from "@/lib/db/prisma";

export interface AuditLogInput {
  actorType?: "admin" | "customer" | "system";
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  snapshot?: Record<string, unknown> | null;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.$executeRaw`
    INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, snapshot)
    VALUES (
      ${input.actorType ?? "admin"}::actor_type,
      ${input.actorId ?? null}::uuid,
      ${input.action},
      ${input.entityType},
      ${input.entityId ?? null}::uuid,
      ${input.snapshot ? JSON.stringify(input.snapshot) : null}::jsonb
    )
  `;
}

export async function listAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const limit = params.limit ?? 30;

  if (params.entityType && params.entityId) {
    return prisma.$queryRaw<
      Array<{
        id: string;
        actor_type: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        snapshot: unknown;
        created_at: Date;
      }>
    >`
      SELECT id, actor_type, actor_id, action, entity_type, entity_id, snapshot, created_at
      FROM audit_logs
      WHERE entity_type = ${params.entityType}
        AND entity_id = ${params.entityId}::uuid
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  if (params.entityType) {
    return prisma.$queryRaw<
      Array<{
        id: string;
        actor_type: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        snapshot: unknown;
        created_at: Date;
      }>
    >`
      SELECT id, actor_type, actor_id, action, entity_type, entity_id, snapshot, created_at
      FROM audit_logs
      WHERE entity_type = ${params.entityType}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
  }

  return prisma.$queryRaw<
    Array<{
      id: string;
      actor_type: string;
      actor_id: string | null;
      action: string;
      entity_type: string;
      entity_id: string | null;
      snapshot: unknown;
      created_at: Date;
    }>
  >`
    SELECT id, actor_type, actor_id, action, entity_type, entity_id, snapshot, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export function mapAuditLogRow(row: {
  id: string;
  actor_type: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  snapshot: unknown;
  created_at: Date;
}) {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    snapshot: row.snapshot,
    createdAt: row.created_at.toISOString(),
  };
}
