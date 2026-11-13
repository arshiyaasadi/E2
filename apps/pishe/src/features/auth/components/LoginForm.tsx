"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { BrandMark } from "@/components/atoms/BrandMark";
import { Button } from "@/components/atoms/Button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/atoms/Card";
import { Checkbox } from "@/components/atoms/Checkbox";
import { Input } from "@/components/atoms/Input";
import { FormField } from "@/components/molecules/FormField";
import { useLoginMutation } from "@/features/auth/queries";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { ApiClientError, handleApiError } from "@/lib/api/client";
import { ROUTES } from "@/config/routes";

export function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const login = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      router.replace(ROUTES.home);
      router.refresh();
    } catch {
      // surfaced via login.error
    }
  });

  const errorText = (() => {
    if (!login.isError) return null;
    if (!(login.error instanceof ApiClientError)) {
      return handleApiError(login.error) || t("errors.invalidCredentials");
    }
    if (login.error.code === "PRE_REGISTRATION_PENDING") {
      return t("errors.registrationPending");
    }
    const msg = login.error.message.toLowerCase();
    if (msg.includes("realm does not exist")) return t("errors.realmMissing");
    if (
      login.error.code === "SERVICE_UNAVAILABLE" ||
      login.error.code === "KEYCLOAK_ERROR"
    ) {
      return t("errors.serviceUnavailable");
    }
    return handleApiError(login.error) || t("errors.invalidCredentials");
  })();

  return (
    <div className="grid gap-mol-md md:grid-cols-2">
      <Card className="order-2 md:order-1">
        <CardHeader className="items-center text-center">
          <div className="flex flex-col items-center gap-atom-md">
            <span className="inline-flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrandMark />
            </span>
            <p className="text-base font-semibold tracking-wide text-primary">
              {tCommon("appName")}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{t("loginTitle")}</h1>
          </div>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardBody>
            {errorText ? <Alert variant="error">{errorText}</Alert> : null}

            <FormField
              label={t("username")}
              htmlFor="username"
              error={errors.username ? t(`errors.${errors.username.message}`) : undefined}
            >
              <Input
                id="username"
                autoComplete="username"
                invalid={Boolean(errors.username)}
                {...register("username")}
              />
            </FormField>

            <FormField
              label={t("password")}
              htmlFor="password"
              error={errors.password ? t(`errors.${errors.password.message}`) : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                {...register("password")}
              />
            </FormField>

            <Checkbox id="rememberMe" label={t("rememberMe")} {...register("rememberMe")} />
          </CardBody>

          <CardFooter>
            <Button type="submit" fullWidth loading={login.isPending}>
              {t("loginSubmit")}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="order-1 flex flex-col justify-between gap-mol rounded-lg border border-primary/25 bg-gradient-to-br from-primary to-primary-hover p-pad-mol-md text-white shadow-[0_12px_40px_rgba(15,118,110,0.28)] md:order-2">
        <div className="flex flex-col gap-mol">
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-white/15">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-atom-md">
            <h2 className="text-xl font-bold leading-snug">{t("promoTitle")}</h2>
            <p className="text-sm leading-relaxed text-white/90">{t("promoBody")}</p>
          </div>
        </div>
        <Link href={ROUTES.register} className="block">
          <Button
            type="button"
            variant="outline"
            fullWidth
            size="lg"
            className="border-white/45 bg-transparent text-white hover:bg-white/10 focus-visible:ring-white/40"
          >
            {t("promoCta")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
