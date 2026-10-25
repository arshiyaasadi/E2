"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms";
import { useAuthUser } from "@/store/slices/auth.slice";
import { useLogout } from "@/features/auth/queries";

export function AdminHeader() {
  const t = useTranslations("admin");
  const user = useAuthUser();
  const logout = useLogout();

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-pad-mol py-pad-atom-md">
      <div>
        <p className="text-sm font-medium text-foreground">{user.fullName ?? user.email}</p>
        <p className="text-xs text-muted">{user.role}</p>
      </div>
      <Button variant="outline" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
        {t("header.logout")}
      </Button>
    </header>
  );
}
