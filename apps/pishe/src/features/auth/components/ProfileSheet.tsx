"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Drawer } from "vaul";
import {
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Shield,
  Sun,
  UserRound,
} from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Spinner } from "@/components/atoms/Spinner";
import { FormField } from "@/components/molecules/FormField";
import {
  useLogoutMutation,
  useMeQuery,
  useSessionsQuery,
  useUpdateProfileMutation,
} from "@/features/auth/queries";
import {
  formatJalaliDateTime,
  formatNowJalaliDateTime,
} from "@/lib/datetime/jalali";
import { handleApiError } from "@/lib/api/client";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";
import { useSetTheme, useTheme } from "@/store/hooks/use-theme";
import { useAuthStore } from "@/store/slices/auth.slice";
import type { ThemeMode } from "@/store/slices/ui.slice";

const THEME_OPTIONS: {
  value: ThemeMode;
  icon: typeof Sun;
  labelKey: "themeLight" | "themeDark" | "themeSystem";
}[] = [
  { value: "light", icon: Sun, labelKey: "themeLight" },
  { value: "dark", icon: Moon, labelKey: "themeDark" },
  { value: "system", icon: Monitor, labelKey: "themeSystem" },
];

type ModalKind = "sessions" | "edit-profile" | "logout";

export function useProfileOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sheet = searchParams.get("sheet");
  const modal = searchParams.get("modal") as ModalKind | null;
  const profileOpen = sheet === "profile";
  const sessionsOpen = modal === "sessions";
  const editOpen = modal === "edit-profile";
  const logoutOpen = modal === "logout";

  const replaceParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openProfile = useCallback(() => {
    replaceParams((p) => {
      p.set("sheet", "profile");
      p.delete("modal");
    });
  }, [replaceParams]);

  const closeProfile = useCallback(() => {
    replaceParams((p) => {
      p.delete("sheet");
    });
  }, [replaceParams]);

  const openModal = useCallback(
    (kind: ModalKind) => {
      replaceParams((p) => {
        p.delete("sheet");
        p.set("modal", kind);
      });
    },
    [replaceParams],
  );

  const closeModal = useCallback(() => {
    replaceParams((p) => {
      p.delete("modal");
    });
  }, [replaceParams]);

  return {
    profileOpen,
    sessionsOpen,
    editOpen,
    logoutOpen,
    openProfile,
    closeProfile,
    openModal,
    closeModal,
  };
}

export function ProfileTrigger() {
  const t = useTranslations("profile");
  const { openProfile } = useProfileOverlay();
  const user = useAuthStore((s) => s.user);

  return (
    <button
      type="button"
      aria-label={t("open")}
      onClick={openProfile}
      className={cn(
        "inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-foreground shadow-sm",
        "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-4 text-primary" aria-hidden />
      )}
    </button>
  );
}

function CenterModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("profile");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-pad-mol">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-border px-pad-mol py-pad-mol">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
        <div className="overflow-y-auto p-pad-mol">{children}</div>
      </div>
    </div>
  );
}

export function ProfileOverlays() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const logout = useLogoutMutation();
  const updateProfile = useUpdateProfileMutation();
  const theme = useTheme();
  const setTheme = useSetTheme();
  const { isLoading } = useMeQuery();
  const user = useAuthStore((s) => s.user);
  const {
    profileOpen,
    sessionsOpen,
    editOpen,
    logoutOpen,
    closeProfile,
    openModal,
    closeModal,
  } = useProfileOverlay();

  const sessionsQuery = useSessionsQuery(profileOpen || sessionsOpen);
  const recentSessions = (sessionsQuery.data ?? []).slice(0, 2);

  const [nowLabel, setNowLabel] = useState(formatNowJalaliDateTime);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNowLabel(formatNowJalaliDateTime());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!editOpen || !user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEditError(null);
  }, [editOpen, user]);

  const initials = useMemo(() => {
    const a = (user?.firstName || "").trim().charAt(0);
    const b = (user?.lastName || "").trim().charAt(0);
    return (a + b || user?.displayName?.charAt(0) || "?").toUpperCase();
  }, [user]);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.displayName ||
    t("noName");

  return (
    <>
      <Drawer.Root
        open={profileOpen}
        onOpenChange={(open) => {
          if (!open) closeProfile();
        }}
        shouldScaleBackground
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/45" />
          <Drawer.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-surface outline-none",
              "shadow-[0_-12px_40px_rgba(15,23,42,0.18)] dark:shadow-[0_-12px_40px_rgba(0,0,0,0.55)]",
            )}
          >
            <div className="mx-auto mt-pad-atom-md h-1.5 w-12 shrink-0 rounded-full bg-border" />
            <Drawer.Title className="px-pad-mol-md pt-pad-atom-md text-center text-sm font-semibold text-foreground">
              {t("title")}
            </Drawer.Title>
            <div className="overflow-y-auto px-pad-mol-md pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-pad-mol">
              {isLoading && !user ? (
                <div className="flex justify-center py-pad-org">
                  <Spinner />
                </div>
              ) : (
                <div className="flex flex-col gap-mol-md">
                  <div className="flex items-center gap-mol">
                    <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-lg font-semibold text-primary shadow-sm">
                      {user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {fullName}
                      </p>
                      <p className="text-sm text-muted" dir="ltr">
                        {user?.mobile || t("noName")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("editProfile")}
                      onClick={() => openModal("edit-profile")}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm hover:bg-surface-2"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  </div>

                  <section className="flex flex-col gap-atom-md">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("systemInfo")}
                    </h3>
                    <dl className="grid gap-atom-md rounded-xl border border-border bg-surface-2/60 p-pad-mol text-sm">
                      <div className="flex justify-between gap-mol">
                        <dt className="text-muted">{t("currency")}</dt>
                        <dd className="font-medium text-foreground">
                          {t("currencyValue")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-mol">
                        <dt className="text-muted">{t("displayCalendar")}</dt>
                        <dd className="font-medium text-foreground">
                          {t("displayCalendarValue")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-mol">
                        <dt className="text-muted">{t("currentDateTime")}</dt>
                        <dd className="font-medium text-foreground" dir="ltr">
                          {nowLabel}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="flex flex-col gap-atom-md">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t("theme")}
                    </h3>
                    <div className="flex gap-atom-md">
                      {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTheme(value)}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-atom rounded-xl border px-pad-atom py-pad-atom-md text-xs transition-colors",
                            theme === value
                              ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
                              : "border-border bg-surface text-muted hover:bg-surface-2",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span>{tCommon(labelKey)}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="flex flex-col gap-atom-md">
                    <h3 className="flex items-center gap-atom text-sm font-semibold text-foreground">
                      <Shield className="size-4 text-muted" aria-hidden />
                      {t("security")}
                    </h3>
                    {sessionsQuery.isLoading ? (
                      <div className="flex justify-center py-pad-mol">
                        <Spinner />
                      </div>
                    ) : recentSessions.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border px-pad-mol py-pad-mol text-center text-sm text-muted">
                        {t("sessionsEmpty")}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-atom-md">
                        {recentSessions.map((s) => (
                          <li
                            key={s.id}
                            className="rounded-xl border border-border bg-surface-2/50 p-pad-mol text-sm shadow-sm"
                          >
                            <p className="font-medium text-foreground">
                              {s.deviceLabel}
                            </p>
                            <p className="text-muted">
                              {t("sessionTime")}:{" "}
                              {formatJalaliDateTime(s.createdAt)}
                            </p>
                            {s.ip ? (
                              <p className="text-muted" dir="ltr">
                                {t("sessionIp")}: {s.ip}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => openModal("sessions")}
                    >
                      {t("sessions")}
                    </Button>
                  </section>

                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => openModal("logout")}
                  >
                    <LogOut className="me-2 size-4" aria-hidden />
                    {t("logout")}
                  </Button>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {editOpen ? (
        <CenterModal title={t("editTitle")} onClose={closeModal}>
          <form
            className="flex flex-col gap-mol"
            onSubmit={async (e) => {
              e.preventDefault();
              setEditError(null);
              try {
                await updateProfile.mutateAsync({
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                });
                closeModal();
              } catch (err) {
                setEditError(handleApiError(err));
              }
            }}
          >
            <FormField label={t("firstName")}>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </FormField>
            <FormField label={t("lastName")}>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
            </FormField>
            <FormField label={t("mobile")}>
              <Input value={user?.mobile ?? ""} disabled dir="ltr" />
              <p className="text-xs text-muted">{t("mobileReadonly")}</p>
            </FormField>
            {editError ? <Alert variant="error">{editError}</Alert> : null}
            <Button type="submit" fullWidth loading={updateProfile.isPending}>
              {t("saveProfile")}
            </Button>
          </form>
        </CenterModal>
      ) : null}

      {sessionsOpen ? (
        <CenterModal title={t("sessionsTitle")} onClose={closeModal}>
          {sessionsQuery.isLoading ? (
            <div className="flex justify-center py-pad-org">
              <Spinner />
            </div>
          ) : (sessionsQuery.data?.length ?? 0) === 0 ? (
            <p className="text-center text-sm text-muted">{t("sessionsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-atom-md">
              {sessionsQuery.data!.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-border bg-surface-2/50 p-pad-mol text-sm shadow-sm"
                >
                  <p className="font-medium text-foreground">
                    {t("sessionDevice")}: {s.deviceLabel}
                  </p>
                  <p className="text-muted">
                    {t("sessionTime")}: {formatJalaliDateTime(s.createdAt)}
                  </p>
                  {s.ip ? (
                    <p className="text-muted" dir="ltr">
                      {t("sessionIp")}: {s.ip}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CenterModal>
      ) : null}

      {logoutOpen ? (
        <CenterModal title={t("logoutConfirmTitle")} onClose={closeModal}>
          <p className="mb-mol text-sm text-muted">{t("logoutConfirmBody")}</p>
          <div className="flex gap-atom-md">
            <Button
              variant="danger"
              fullWidth
              loading={logout.isPending}
              onClick={async () => {
                await logout.mutateAsync();
                closeModal();
                router.replace(ROUTES.login);
                router.refresh();
              }}
            >
              {t("logoutConfirm")}
            </Button>
            <Button variant="outline" fullWidth onClick={closeModal}>
              {t("cancel")}
            </Button>
          </div>
        </CenterModal>
      ) : null}
    </>
  );
}
