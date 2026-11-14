"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { useMyBusinessesQuery } from "@/features/businesses/queries";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { ROUTES } from "@/config/routes";
import { useAuthStore } from "@/store/slices/auth.slice";

export function BusinessesContent() {
  const t = useTranslations("businesses");
  const user = useAuthStore((s) => s.user);
  const query = useMyBusinessesQuery();

  return (
    <AppTemplate title={t("title")}>
      <div className="mb-mol flex items-center justify-between gap-mol">
        <p className="text-sm text-muted">{t("title")}</p>
        {user?.isSuperAdmin ? (
          <Link href={ROUTES.adminBusinesses}>
            <Button size="sm" variant="outline">
              {t("adminTitle")}
            </Button>
          </Link>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : (query.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-pad-mol py-pad-org text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-mol">
          {query.data!.map(({ role, business }) => (
            <li
              key={business!.id}
              className="rounded-2xl border border-border bg-surface p-pad-mol shadow-sm"
              style={
                business!.color
                  ? { borderColor: business!.color }
                  : undefined
              }
            >
              <div className="flex items-start gap-mol">
                {business!.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={business!.logoUrl}
                    alt=""
                    className="size-12 rounded-xl object-cover"
                  />
                ) : (
                  <div
                    className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary"
                    style={
                      business!.color
                        ? { backgroundColor: `${business!.color}22`, color: business!.color }
                        : undefined
                    }
                  >
                    {business!.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {business!.name}
                  </p>
                  <p className="text-xs text-muted" dir="ltr">
                    {t("code")}: {business!.code}
                  </p>
                  <p className="text-xs text-muted">
                    {role === "MANAGER" ? t("roleManager") : t("roleAssistant")}
                    {" · "}
                    {t("assignedAt")}: {formatJalaliDateTime(business!.assignedAt)}
                  </p>
                  {business!.description ? (
                    <p className="mt-atom line-clamp-2 text-sm text-muted">
                      {business!.description}
                    </p>
                  ) : null}
                </div>
                <Link href={ROUTES.businessMembers(business!.id)}>
                  <Button size="sm" variant="outline">
                    <Users className="me-1 size-4" aria-hidden />
                    {t("openMembers")}
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppTemplate>
  );
}
