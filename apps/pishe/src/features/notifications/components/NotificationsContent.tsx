"use client";

import { useTranslations } from "next-intl";
import { BellOff } from "lucide-react";
import { EmptyState } from "@/components/molecules/EmptyState";
import { AppTemplate } from "@/components/templates/AppTemplate";

export function NotificationsContent() {
  const t = useTranslations("notifications");

  return (
    <AppTemplate title={t("title")}>
      <EmptyState
        title={t("emptyTitle")}
        body={t("emptyBody")}
        icon={<BellOff className="size-7" aria-hidden />}
      />
    </AppTemplate>
  );
}
