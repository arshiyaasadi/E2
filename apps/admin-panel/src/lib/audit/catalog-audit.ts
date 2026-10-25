import { createAuditLog } from "@/lib/db/repositories/audit.repository";

export async function logCatalogAudit(params: {
  actorId: string;
  action: string;
  entityType:
    | "category"
    | "product"
    | "brand"
    | "tag"
    | "coupon"
    | "promotion"
    | "order"
    | "customer"
    | "blog_post"
    | "blog_category"
    | "blog_tag"
    | "shop_page";
  entityId: string;
  snapshot?: Record<string, unknown> | null;
}) {
  await createAuditLog({
    actorId: params.actorId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    snapshot: params.snapshot ?? null,
  });
}
