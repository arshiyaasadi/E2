"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

function formatBytes(raw: string | number | bigint): string {
  const n = typeof raw === "bigint" ? Number(raw) : Number(raw);
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KiB", "MiB", "GiB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function StorageMeter({
  usedBytes,
  quotaBytes,
  label,
  className,
}: {
  usedBytes: string;
  quotaBytes: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("spaces");
  const used = Number(usedBytes);
  const quota = Number(quotaBytes);
  const pct =
    quota > 0 && Number.isFinite(used)
      ? Math.min(100, Math.max(0, (used / quota) * 100))
      : 0;

  return (
    <div className={cn("flex flex-col gap-atom-md", className)}>
      <div className="flex items-baseline justify-between gap-mol text-sm">
        <span className="font-medium text-foreground">
          {label ?? t("storage")}
        </span>
        <span className="text-muted" dir="ltr">
          {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? t("storage")}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            pct >= 90
              ? "bg-red-500"
              : pct >= 70
                ? "bg-amber-500"
                : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted" dir="ltr">
        {pct.toFixed(1)}% · {t("remaining")}:{" "}
        {formatBytes(Math.max(0, quota - used))}
      </p>
    </div>
  );
}
