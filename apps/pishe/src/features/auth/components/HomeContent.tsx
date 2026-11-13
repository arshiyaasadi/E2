"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/atoms/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { useLogoutMutation, useMeQuery } from "@/features/auth/queries";
import { ROUTES } from "@/config/routes";
import { useAuthStore } from "@/store/slices/auth.slice";

export function HomeContent() {
  const t = useTranslations("home");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { isLoading } = useMeQuery();
  const user = useAuthStore((s) => s.user);
  const logout = useLogoutMutation();

  if (isLoading && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <AppTemplate
      title={t("title")}
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={logout.isPending}
          onClick={async () => {
            await logout.mutateAsync();
            router.replace(ROUTES.login);
            router.refresh();
          }}
        >
          {tAuth("logout")}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("welcome", { name: user?.displayName ?? "" })}</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-muted">{t("welcomeBody")}</p>
          <p className="text-sm text-muted">
            {t("signedInAs", { username: user?.username ?? "" })}
          </p>
        </CardBody>
      </Card>
    </AppTemplate>
  );
}
