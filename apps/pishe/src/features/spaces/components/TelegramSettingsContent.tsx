"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Copy, ExternalLink, Pause, Play, Unlink } from "lucide-react";
import { Alert } from "@/components/atoms/Alert";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import { AppTemplate } from "@/components/templates/AppTemplate";
import { StorageMeter } from "@/features/spaces/components/StorageMeter";
import {
  useBusinessTelegramQuery,
  usePatchTelegramConfigMutation,
  usePauseTelegramMutation,
  usePrepareTelegramMutation,
  useResumeTelegramMutation,
  useUnlinkTelegramMutation,
} from "@/features/spaces/queries";
import { useMyBusinessesQuery } from "@/features/businesses/queries";
import { handleApiError } from "@/lib/api/client";
import { formatJalaliDateTime } from "@/lib/datetime/jalali";
import { ROUTES } from "@/config/routes";

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-mol rounded-xl border border-border bg-surface-2/40 px-pad-mol py-pad-atom-md text-sm">
      <span className="text-foreground">{label}</span>
      <input
        type="checkbox"
        className="size-4 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function TelegramSettingsContent({ businessId }: { businessId: string }) {
  const t = useTranslations("spaces");
  const tBiz = useTranslations("businesses");
  const businesses = useMyBusinessesQuery();
  const telegram = useBusinessTelegramQuery(businessId);
  const prepareMut = usePrepareTelegramMutation(businessId);
  const patchMut = usePatchTelegramConfigMutation(businessId);
  const unlinkMut = useUnlinkTelegramMutation(businessId);
  const pauseMut = usePauseTelegramMutation(businessId);
  const resumeMut = useResumeTelegramMutation(businessId);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const current = businesses.data?.find((b) => b.business?.id === businessId);
  const businessName = current?.business?.name ?? t("telegramTitle");
  const data = telegram.data;

  const statusLabel = (() => {
    const s = data?.binding?.status;
    if (s === "ACTIVE" && data?.binding?.ingestPaused) return t("statusPaused");
    if (s === "ACTIVE") return t("statusActive");
    if (s === "PENDING") return t("statusPending");
    if (s === "REVOKED") return t("statusRevoked");
    return t("statusNone");
  })();

  return (
    <AppTemplate
      title={t("telegramTitle")}
      crumbs={[
        { label: tBiz("nav"), href: ROUTES.businesses },
        { label: businessName, href: ROUTES.businessMembers(businessId) },
        { label: t("telegramTitle") },
      ]}
    >
      {telegram.isLoading ? (
        <div className="flex justify-center py-pad-org">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-mol-md">
          {error ? <Alert variant="error">{error}</Alert> : null}

          {data?.usage ? (
            <section className="rounded-2xl border border-border bg-surface p-pad-mol">
              <StorageMeter
                usedBytes={data.usage.usedBytes}
                quotaBytes={data.usage.quotaBytes}
                label={t("businessStorage")}
              />
            </section>
          ) : null}

          <section className="flex flex-col gap-mol rounded-2xl border border-border bg-surface p-pad-mol">
            <div className="flex items-start justify-between gap-mol">
              <div>
                <h2 className="font-semibold text-foreground">
                  {t("bindingStatus")}
                </h2>
                <p className="text-sm text-muted">{statusLabel}</p>
                {data?.binding?.title ? (
                  <p className="mt-atom text-sm text-foreground">
                    {data.binding.title}
                  </p>
                ) : null}
                {data?.binding?.telegramChatId ? (
                  <p className="text-xs text-muted" dir="ltr">
                    chat {data.binding.telegramChatId}
                  </p>
                ) : null}
              </div>
              {data?.binding?.status === "ACTIVE" ? (
                <Button
                  size="sm"
                  variant="danger"
                  loading={unlinkMut.isPending}
                  onClick={async () => {
                    setError(null);
                    try {
                      await unlinkMut.mutateAsync();
                    } catch (err) {
                      setError(handleApiError(err));
                    }
                  }}
                >
                  <Unlink className="me-1 size-4" aria-hidden />
                  {t("unlink")}
                </Button>
              ) : null}
            </div>

            <div className="rounded-xl border border-dashed border-border p-pad-mol">
              <p className="mb-atom text-xs text-muted">{t("businessCode")}</p>
              <div className="flex items-center gap-atom-md">
                <p
                  className="flex-1 font-mono text-lg font-semibold tracking-widest"
                  dir="ltr"
                >
                  {data?.businessCode ?? current?.business?.code ?? "—"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const code =
                      data?.businessCode ?? current?.business?.code ?? "";
                    if (!code) return;
                    try {
                      await navigator.clipboard.writeText(code);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  <Copy className="me-1 size-4" aria-hidden />
                  {copied ? t("copied") : t("copyCode")}
                </Button>
              </div>
              <p className="mt-atom-md text-xs text-muted">{t("registerHint")}</p>
            </div>

            <div className="flex flex-col gap-atom-md sm:flex-row">
              <Button
                fullWidth
                loading={prepareMut.isPending}
                onClick={async () => {
                  setError(null);
                  try {
                    const res = await prepareMut.mutateAsync();
                    if (res.deepLink) {
                      window.open(res.deepLink, "_blank", "noopener,noreferrer");
                    }
                  } catch (err) {
                    setError(handleApiError(err));
                  }
                }}
              >
                {t("startRegister")}
              </Button>
              {data?.deepLink ? (
                <a
                  href={data.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full"
                >
                  <Button fullWidth variant="outline" type="button">
                    <ExternalLink className="me-1 size-4" aria-hidden />
                    @{data.botUsername}
                  </Button>
                </a>
              ) : null}
            </div>
          </section>

          {data?.binding?.status === "ACTIVE" ? (
            <section className="flex flex-col gap-mol rounded-2xl border border-border bg-surface p-pad-mol">
              <h2 className="font-semibold text-foreground">
                {t("botManagement")}
              </h2>
              <div className="flex flex-col gap-atom-md text-sm">
                <p className="text-muted">
                  {t("lastIngested")}:{" "}
                  {data.binding.lastIngestedAt ? (
                    <span className="text-foreground">
                      {formatJalaliDateTime(data.binding.lastIngestedAt)}
                    </span>
                  ) : (
                    t("lastIngestedNone")
                  )}
                </p>
                <p className="text-muted" dir="ltr">
                  {t("cursorMessageId")}:{" "}
                  <span className="font-mono text-foreground">
                    {data.binding.lastIngestedMessageId ?? "—"}
                  </span>
                </p>
                <p className="text-muted">
                  {t("recentCount")}:{" "}
                  <span className="text-foreground">
                    {data.management?.recentIngestedCount ?? 0}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-atom-md sm:flex-row">
                {data.binding.ingestPaused ? (
                  <Button
                    fullWidth
                    loading={resumeMut.isPending}
                    onClick={async () => {
                      setError(null);
                      try {
                        await resumeMut.mutateAsync();
                      } catch (err) {
                        setError(handleApiError(err));
                      }
                    }}
                  >
                    <Play className="me-1 size-4" aria-hidden />
                    {t("resumeIngest")}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outline"
                    loading={pauseMut.isPending}
                    onClick={async () => {
                      setError(null);
                      try {
                        await pauseMut.mutateAsync();
                      } catch (err) {
                        setError(handleApiError(err));
                      }
                    }}
                  >
                    <Pause className="me-1 size-4" aria-hidden />
                    {t("pauseIngest")}
                  </Button>
                )}
              </div>

              {(data.management?.recentItems?.length ?? 0) > 0 ? (
                <div className="flex flex-col gap-atom-md">
                  <h3 className="text-sm font-medium text-foreground">
                    {t("recentItems")}
                  </h3>
                  <ul className="flex flex-col gap-atom">
                    {data.management!.recentItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-border bg-surface-2/40 px-pad-mol py-pad-atom-md text-xs"
                      >
                        <p className="truncate font-mono text-foreground" dir="ltr">
                          {item.path}
                        </p>
                        <p className="mt-atom text-muted">
                          {item.telegramArtifact ?? "—"} · msg{" "}
                          <span dir="ltr">{item.telegramMessageId ?? "—"}</span>
                          {" · "}
                          {formatJalaliDateTime(item.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {data?.config ? (
            <section className="flex flex-col gap-atom-md rounded-2xl border border-border bg-surface p-pad-mol">
              <h2 className="font-semibold text-foreground">
                {t("ingestConfig")}
              </h2>
              <p className="text-xs text-muted">{t("ingestHint")}</p>
              {(
                [
                  ["storeText", t("storeText")],
                  ["downloadPhoto", t("downloadPhoto")],
                  ["downloadDocument", t("downloadDocument")],
                  ["downloadVideo", t("downloadVideo")],
                  ["downloadAudio", t("downloadAudio")],
                ] as const
              ).map(([key, label]) => (
                <ToggleRow
                  key={key}
                  label={label}
                  checked={Boolean(data.config[key])}
                  disabled={patchMut.isPending}
                  onChange={async (v) => {
                    setError(null);
                    try {
                      await patchMut.mutateAsync({ [key]: v });
                    } catch (err) {
                      setError(handleApiError(err));
                    }
                  }}
                />
              ))}
            </section>
          ) : null}

          <Link href={ROUTES.businessMembers(businessId)}>
            <Button variant="ghost" fullWidth>
              {tBiz("back")}
            </Button>
          </Link>
        </div>
      )}
    </AppTemplate>
  );
}
