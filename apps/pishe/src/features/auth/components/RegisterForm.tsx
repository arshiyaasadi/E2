"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from "@/components/atoms/Card";
import { Input } from "@/components/atoms/Input";
import { FormField } from "@/components/molecules/FormField";
import { useRegisterMutation } from "@/features/auth/queries";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas";
import { ApiClientError, handleApiError } from "@/lib/api/client";
import { ROUTES } from "@/config/routes";

export function RegisterForm() {
  const t = useTranslations("auth");
  const registerMutation = useRegisterMutation();
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobile: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync(values);
      setDone(true);
    } catch {
      // surfaced via mutation error
    }
  });

  if (done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("registerSuccessTitle")}</CardTitle>
        </CardHeader>
        <CardBody>
          <Alert variant="success">{t("registerSuccessBody")}</Alert>
          <p className="text-sm text-muted">{t("registerSuccessNote")}</p>
        </CardBody>
        <CardFooter>
          <Link href={ROUTES.login}>
            <Button type="button" fullWidth>
              {t("backToLogin")}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const errorMessage = (() => {
    if (!registerMutation.isError) return null;
    if (!(registerMutation.error instanceof ApiClientError)) {
      return handleApiError(registerMutation.error) || t("errors.registerFailed");
    }
    if (registerMutation.error.code === "CONFLICT") return t("errors.conflict");
    if (registerMutation.error.message.toLowerCase().includes("realm does not exist")) {
      return t("errors.realmMissing");
    }
    if (
      registerMutation.error.code === "SERVICE_UNAVAILABLE" ||
      registerMutation.error.code === "KEYCLOAK_ERROR"
    ) {
      return t("errors.serviceUnavailable");
    }
    return handleApiError(registerMutation.error) || t("errors.registerFailed");
  })();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("registerTitle")}</CardTitle>
        <p className="text-sm text-muted">{t("registerSubtitle")}</p>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardBody>
          {errorMessage ? <Alert variant="error">{errorMessage}</Alert> : null}

          <div className="grid gap-mol sm:grid-cols-2">
            <FormField
              label={t("firstName")}
              htmlFor="firstName"
              error={errors.firstName ? t(`errors.${errors.firstName.message}`) : undefined}
            >
              <Input
                id="firstName"
                autoComplete="given-name"
                invalid={Boolean(errors.firstName)}
                {...register("firstName")}
              />
            </FormField>

            <FormField
              label={t("lastName")}
              htmlFor="lastName"
              error={errors.lastName ? t(`errors.${errors.lastName.message}`) : undefined}
            >
              <Input
                id="lastName"
                autoComplete="family-name"
                invalid={Boolean(errors.lastName)}
                {...register("lastName")}
              />
            </FormField>
          </div>

          <FormField
            label={t("mobile")}
            htmlFor="mobile"
            error={errors.mobile ? t(`errors.${errors.mobile.message}`) : undefined}
          >
            <Input
              id="mobile"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("mobileHint")}
              dir="ltr"
              className="text-start"
              invalid={Boolean(errors.mobile)}
              {...register("mobile")}
            />
          </FormField>
        </CardBody>

        <CardFooter>
          <Button type="submit" fullWidth loading={registerMutation.isPending}>
            {t("registerSubmit")}
          </Button>
          <p className="text-center text-sm text-muted">
            {t("haveAccount")}{" "}
            <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
              {t("goLogin")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
