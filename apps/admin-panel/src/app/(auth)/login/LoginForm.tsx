"use client";

import { AnimatePresence, LayoutGroup, motion, useInView } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert, Button } from "@/components/atoms";
import { clientEnv, isClientUiMode } from "@/config/env.client";
import { ROUTES } from "@/config/routes";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { apiClient } from "@/lib/api/client";
import { AuthHeroSlider, type AuthHeroSlide } from "./AuthHeroSlider";

const ctaTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 26,
};

function errorMessage(
  code: string | null,
  t: ReturnType<typeof useTranslations<"auth">>,
): string | null {
  if (!code) return null;
  switch (code) {
    case "forbidden":
      return t("forbiddenRole");
    case "inactive":
      return t("inactiveUser");
    case "invalid_state":
    case "missing_code":
    case "login_failed":
      return t("loginFailed");
    case "invalid_credentials":
      return t("invalidCredentials");
    default:
      return t("loginFailed");
  }
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const uiMode = isClientUiMode();
  const err = errorMessage(searchParams.get("error"), t);
  const [email, setEmail] = useState("admin@local.dev");
  const [password, setPassword] = useState("admin123");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const loginSectionRef = useRef<HTMLElement | null>(null);
  const loginInView = useInView(loginSectionRef, {
    amount: 0.35,
    margin: "0px 0px -22% 0px",
  });
  const slides = useMemo<AuthHeroSlide[]>(
    () => [
      {
        badge: t("sliderSlides.operations.badge"),
        title: t("sliderSlides.operations.title"),
        description: t("sliderSlides.operations.description"),
      },
      {
        badge: t("sliderSlides.insights.badge"),
        title: t("sliderSlides.insights.title"),
        description: t("sliderSlides.insights.description"),
      },
      {
        badge: t("sliderSlides.campaigns.badge"),
        title: t("sliderSlides.campaigns.title"),
        description: t("sliderSlides.campaigns.description"),
      },
    ],
    [t],
  );

  function startOidc() {
    window.location.href = "/api/auth/oidc/start";
  }

  async function submitUiLogin(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
      router.replace(ROUTES.adminDashboard);
      router.refresh();
    } catch {
      setFormError(t("invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToLogin() {
    loginSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <LayoutGroup id="auth-login-cta">
      <div className="auth-login-bg min-h-screen p-3 sm:p-4 lg:h-screen lg:overflow-hidden lg:p-6">
        <AnimatePresence>
          {!loginInView && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={ctaTransition}
              className="fixed inset-x-3 bottom-4 z-50 sm:inset-x-4 sm:bottom-5 lg:hidden"
            >
              <motion.div layoutId="mobile-login-cta" transition={ctaTransition}>
                <Button
                  type="button"
                  fullWidth
                  onClick={scrollToLogin}
                  endIcon={<ArrowDown className="size-4" />}
                  className="h-12 rounded-xl text-sm font-semibold shadow-[0_16px_40px_rgba(63,94,251,0.32)]"
                >
                  {t("scrollToLogin")}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          dir="ltr"
          className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-7xl flex-col gap-3 rounded-[32px] border border-white/80 bg-white/60 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:min-h-[calc(100svh-2rem)] sm:gap-4 sm:p-4 lg:h-full lg:min-h-0 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-0"
        >
          <div className="order-1 min-h-[calc(100svh-3rem)] lg:order-2 lg:min-h-0 lg:h-full">
            <AuthHeroSlider slides={slides} className="h-full min-h-full lg:min-h-0" />
          </div>

          <section
            ref={loginSectionRef}
            dir="rtl"
            className="auth-panel-surface order-2 flex min-h-[calc(100svh-3rem)] rounded-[28px] border border-white/80 px-5 py-8 sm:px-8 sm:py-10 lg:order-1 lg:min-h-0 lg:px-10 lg:py-10 xl:px-12"
          >
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 lg:gap-7"
            >
              <div className="space-y-4 text-right">
                <p className="text-base font-semibold tracking-[0.02em] text-auth-accent">{t("eyebrow")}</p>
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold leading-[1.7] text-slate-800 sm:text-[2.6rem]">
                    {t("loginTitle")}
                  </h1>
                  <p className="max-w-sm text-sm leading-7 text-auth-muted sm:text-base">
                    {uiMode ? t("loginDescription") : t("loginDescriptionOidc")}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-auth-accent-soft px-3 py-1.5 text-xs font-medium text-auth-accent">
                  <span className="size-2 rounded-full bg-auth-accent" />
                  <span>{clientEnv.NEXT_PUBLIC_APP_NAME}</span>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {err || formError ? <Alert variant="danger">{formError ?? err}</Alert> : null}

                {uiMode ? (
                  <form className="flex flex-col gap-4" onSubmit={submitUiLogin}>
                    <label className="flex flex-col gap-1.5 text-right text-sm">
                      <span className="font-medium text-slate-700">{t("usernameLabel")}</span>
                      <input
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl border border-auth-border bg-white px-3 text-sm"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-right text-sm">
                      <span className="font-medium text-slate-700">{t("passwordLabel")}</span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("passwordPlaceholder")}
                        className="h-11 rounded-xl border border-auth-border bg-white px-3 text-sm"
                        required
                      />
                    </label>
                    <Button type="submit" fullWidth disabled={submitting} className="h-12 font-semibold">
                      {t("submit")}
                    </Button>
                  </form>
                ) : (
                  <div className="pt-2">
                    <AnimatePresence mode="wait">
                      {loginInView ? (
                        <motion.div
                          key="submit-button"
                          layoutId="mobile-login-cta"
                          transition={ctaTransition}
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 18 }}
                        >
                          <Button type="button" fullWidth onClick={startOidc} className="h-12 font-semibold">
                            {t("submitOidc")}
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="submit-placeholder"
                          initial={{ opacity: 0.65 }}
                          animate={{ opacity: 0.65 }}
                          exit={{ opacity: 0 }}
                          className="hidden h-12 w-full rounded-xl border border-dashed border-auth-border/80 bg-auth-accent-soft/40 lg:block"
                          aria-hidden
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <p className="text-sm leading-7 text-auth-muted">{t("supportHint")}</p>
            </motion.div>
          </section>
        </div>
      </div>
    </LayoutGroup>
  );
}
