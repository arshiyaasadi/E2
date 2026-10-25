"use client";

import { Clock, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Card, EmptyState, Spinner, type BadgeVariant } from "@/components/atoms";
import { useAuditLogs } from "@/features/admin-users/queries";
import { isSuperAdminRole } from "@/config/roles";
import { useAuthUser } from "@/store/slices/auth.slice";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  "admin_user.created": "actions.adminUserCreated",
  "admin_user.updated": "actions.adminUserUpdated",
  "admin_user.deleted": "actions.adminUserDeleted",
  "role.updated": "actions.roleUpdated",
  "category.created": "actions.categoryCreated",
  "category.updated": "actions.categoryUpdated",
  "category.deleted": "actions.categoryDeleted",
  "product.created": "actions.productCreated",
  "product.updated": "actions.productUpdated",
  "product.deleted": "actions.productDeleted",
  "brand.created": "actions.brandCreated",
  "brand.updated": "actions.brandUpdated",
  "brand.deleted": "actions.brandDeleted",
  "tag.created": "actions.tagCreated",
  "tag.updated": "actions.tagUpdated",
  "tag.deleted": "actions.tagDeleted",
  "shop_page.created": "actions.shopPageCreated",
  "shop_page.updated": "actions.shopPageUpdated",
  "shop_page.deleted": "actions.shopPageDeleted",
  "coupon.created": "actions.couponCreated",
  "coupon.updated": "actions.couponUpdated",
  "coupon.deleted": "actions.couponDeleted",
  "promotion.created": "actions.promotionCreated",
  "promotion.updated": "actions.promotionUpdated",
  "promotion.deleted": "actions.promotionDeleted",
  "order.status_updated": "actions.orderStatusUpdated",
  "customer.updated": "actions.customerUpdated",
  "customer.deleted": "actions.customerDeleted",
};

export type AuditEntityType =
  | "admin_user"
  | "role"
  | "category"
  | "product"
  | "brand"
  | "tag"
  | "shop_page"
  | "coupon"
  | "promotion"
  | "order"
  | "customer";

function formatActionLabel(action: string, t: ReturnType<typeof useTranslations>) {
  const key = ACTION_LABELS[action];
  return key ? t(key) : action;
}

function getActionVariant(action: string): BadgeVariant {
  if (action.endsWith(".created")) return "success";
  if (action.endsWith(".deleted")) return "danger";
  if (action.includes("updated")) return "primary";
  return "neutral";
}

function truncateId(id: string | null | undefined, length = 8) {
  if (!id) return "—";
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

function getEntityLabel(snapshot: unknown, entityId: string | null | undefined) {
  if (snapshot && typeof snapshot === "object") {
    const data = snapshot as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name : null;
    const nameFa = typeof data.nameFa === "string" ? data.nameFa : null;
    const slug = typeof data.slug === "string" ? data.slug : null;
    const title = typeof data.title === "string" ? data.title : null;

    if (name && nameFa) return `${name} · ${nameFa}`;
    if (title) return title;
    if (name) return name;
    if (slug) return slug;
  }

  return truncateId(entityId, 12);
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("fa-IR", { year: "numeric", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function AdminAuditHistory({
  entityType,
  entityId,
  title,
  className,
}: {
  entityType: AuditEntityType;
  entityId?: string;
  title?: string;
  className?: string;
}) {
  const t = useTranslations("admin.audit");
  const user = useAuthUser();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const { data, isLoading, isError } = useAuditLogs(
    { entityType, entityId, limit: 20 },
    isSuperAdmin,
  );

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Card padding="none" className={cn("overflow-hidden", className)}>
      <div className="border-b border-white/45 px-mol-md py-pad-mol glass-toolbar">
        <h3 className="text-base font-semibold text-foreground">{title ?? t("title")}</h3>
        <p className="mt-atom-md text-xs text-muted">{t("subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-mol-md">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="p-mol-md text-sm text-danger">{t("error")}</div>
      ) : !data?.length ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="divide-y divide-white/40">
          {data.map((log) => {
            const { date, time } = formatAuditTime(log.createdAt);
            const entityLabel = getEntityLabel(log.snapshot, log.entityId);

            return (
              <li
                key={log.id}
                className="flex flex-col gap-pad-atom-md px-mol-md py-pad-mol transition-colors hover:bg-white/25 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-pad-atom-md">
                  <Badge variant={getActionVariant(log.action)} size="sm" className="mt-0.5 shrink-0">
                    {formatActionLabel(log.action, t)}
                  </Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{entityLabel}</p>
                    {log.entityId ? (
                      <p className="mt-atom-md truncate font-mono text-[11px] text-muted" dir="ltr" title={log.entityId}>
                        {truncateId(log.entityId, 16)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-pad-atom-md gap-y-1 text-xs text-muted sm:justify-end">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5 opacity-70" />
                    <span>{date}</span>
                    <span className="opacity-50">·</span>
                    <span>{time}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5 opacity-70" />
                    <span dir="ltr" title={log.actorId ?? undefined}>
                      {truncateId(log.actorId)}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
