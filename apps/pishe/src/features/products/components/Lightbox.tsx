"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MoreVertical, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Alert } from "@/components/atoms/Alert";
import {
  useDeleteMediaMutation,
  useMediaUsageQuery,
  useReplaceMediaMutation,
} from "@/features/products/queries";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export function Lightbox({
  productId,
  mediaIds,
  startIndex,
  onClose,
  onSetCover,
  onChanged,
}: {
  productId: string;
  mediaIds: string[];
  startIndex: number;
  onClose: () => void;
  onSetCover: (fileId: string) => Promise<void>;
  onChanged: () => void;
}) {
  const t = useTranslations("products.lightbox");
  const tErr = useTranslations("products.errors");
  const tDetail = useTranslations("products.detail");
  const [index, setIndex] = useState(startIndex);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "replace" | "delete">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replace = useReplaceMediaMutation();
  const remove = useDeleteMediaMutation();

  const fileId = mediaIds[index];
  const usage = useMediaUsageQuery(confirm ? fileId : null);
  const otherCount = Math.max(0, (usage.data?.products.length ?? 1) - 1);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.min(mediaIds.length - 1, i + 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mediaIds.length, onClose]);

  async function doReplace(file: File) {
    setError(null);
    try {
      await replace.mutateAsync({ fileId, file });
      setMessage(t("replaced"));
      setConfirm(null);
      onChanged();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  async function doDelete(confirmAll: boolean) {
    setError(null);
    if (mediaIds.length <= 1) {
      setError(tErr("lastPhoto"));
      return;
    }
    try {
      await remove.mutateAsync({ fileId, productId, confirmAll });
      setConfirm(null);
      onChanged();
      onClose();
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white">
      <div className="flex items-center justify-between p-pad-mol">
        <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label={t("menu")}>
          <MoreVertical className="size-5" />
        </button>
        <p className="text-sm">
          {t("counter", { current: index + 1, total: mediaIds.length })}
        </p>
        <button type="button" onClick={onClose} aria-label={t("close")}>
          <X className="size-5" />
        </button>
      </div>

      {menuOpen ? (
        <div className="absolute start-pad-mol top-14 z-10 w-52 rounded-lg border border-white/20 bg-black/80 p-pad-atom">
          <button
            type="button"
            className="block w-full px-pad-atom py-pad-atom text-start text-sm"
            onClick={async () => {
              setMenuOpen(false);
              await onSetCover(fileId);
            }}
          >
            {t("setCover")}
          </button>
          <button
            type="button"
            className="block w-full px-pad-atom py-pad-atom text-start text-sm"
            onClick={() => {
              setMenuOpen(false);
              setConfirm("replace");
            }}
          >
            {t("replace")}
          </button>
          <button
            type="button"
            className="block w-full px-pad-atom py-pad-atom text-start text-sm"
            onClick={() => {
              setMenuOpen(false);
              setConfirm("delete");
            }}
          >
            {t("delete")}
          </button>
        </div>
      ) : null}

      <div className="relative flex flex-1 items-center justify-center px-pad-mol">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/media/${fileId}?t=${Date.now()}`}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
        <button
          type="button"
          className={cn(
            "absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-2 py-4",
            index >= mediaIds.length - 1 && "opacity-30",
          )}
          disabled={index >= mediaIds.length - 1}
          onClick={() => setIndex((i) => i + 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className={cn(
            "absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 px-2 py-4",
            index <= 0 && "opacity-30",
          )}
          disabled={index <= 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          ›
        </button>
      </div>

      {message ? (
        <p className="p-pad-mol text-center text-sm text-success">{message}</p>
      ) : null}
      {error ? (
        <div className="p-pad-mol">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}

      {confirm === "replace" ? (
        <div className="space-y-mol border-t border-white/20 bg-black/80 p-pad-mol">
          {otherCount > 0 ? (
            <p className="text-sm">
              {t("replaceCascade", { count: otherCount })}
              {usage.data ? (
                <span className="mt-1 block text-muted">
                  {usage.data.products.map((p) => p.title).join("، ")}
                </span>
              ) : null}
            </p>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void doReplace(file);
              e.target.value = "";
            }}
          />
          <div className="flex gap-atom-md">
            <Button
              fullWidth
              loading={replace.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {otherCount > 0 ? t("replaceAll") : t("replace")}
            </Button>
            <Button variant="outline" fullWidth onClick={() => setConfirm(null)}>
              {tDetail("cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {confirm === "delete" ? (
        <div className="space-y-mol border-t border-white/20 bg-black/80 p-pad-mol">
          <p className="text-sm">
            {otherCount > 0
              ? t("deleteCascade", { count: otherCount + 1 })
              : t("deleteOne")}
          </p>
          <div className="flex gap-atom-md">
            <Button
              variant="danger"
              fullWidth
              loading={remove.isPending}
              onClick={() => void doDelete(otherCount > 0)}
            >
              {otherCount > 0 ? t("deleteAll") : t("delete")}
            </Button>
            <Button variant="outline" fullWidth onClick={() => setConfirm(null)}>
              {tDetail("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
