"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { RECENT_NOTIFICATION_PREVIEW } from "@/features/notifications/mock";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/cn";

export function useNotificationModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("modal") === "notifications";

  const replaceParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openModal = useCallback(() => {
    replaceParams((p) => {
      p.delete("sheet");
      p.set("modal", "notifications");
    });
  }, [replaceParams]);

  const closeModal = useCallback(() => {
    replaceParams((p) => {
      p.delete("modal");
    });
  }, [replaceParams]);

  return { open, openModal, closeModal };
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const { openModal } = useNotificationModal();
  const unread = RECENT_NOTIFICATION_PREVIEW.some((n) => !n.read);

  return (
    <button
      type="button"
      aria-label={t("open")}
      onClick={openModal}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-sm",
        "hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      )}
    >
      <Bell className="size-4" aria-hidden />
      {unread ? (
        <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-accent ring-2 ring-surface" />
      ) : null}
    </button>
  );
}

export function NotificationModal() {
  const t = useTranslations("notifications");
  const { open, closeModal } = useNotificationModal();
  const items = RECENT_NOTIFICATION_PREVIEW.slice(0, 3);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-pad-mol">
      <button
        type="button"
        aria-label={t("close")}
        className="absolute inset-0 bg-black/50"
        onClick={closeModal}
      />
      <div className="relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_16px_48px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between border-b border-border px-pad-mol py-pad-mol">
          <h2 className="font-semibold text-foreground">{t("previewTitle")}</h2>
          <Button variant="ghost" size="sm" onClick={closeModal}>
            {t("close")}
          </Button>
        </div>
        <ul className="flex flex-col gap-atom-md overflow-y-auto p-pad-mol">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface-2/50 p-pad-mol text-sm shadow-sm"
            >
              <div className="mb-atom flex items-start justify-between gap-mol">
                <p className="font-medium text-foreground">{item.title}</p>
                {!item.read ? (
                  <span className="shrink-0 rounded-full bg-accent/15 px-pad-atom text-[10px] font-medium text-accent">
                    {t("unread")}
                  </span>
                ) : null}
              </div>
              <p className="text-muted">{item.body}</p>
              <p className="mt-atom text-xs text-muted" dir="ltr">
                {formatJalaliDateTime(item.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-pad-mol">
          <Link
            href={ROUTES.notifications}
            onClick={closeModal}
            className="inline-flex h-control w-full items-center justify-center rounded-md border border-border bg-surface text-base font-medium text-foreground shadow-sm hover:bg-surface-2"
          >
            {t("seeAll")}
          </Link>
        </div>
      </div>
    </div>
  );
}
