"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Button, Input, Spinner } from "@/components/atoms";
import { useUploadMedia } from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";
import { MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
import { MEDIA_FOLDERS } from "@/lib/media/folders";
import type { MediaDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface BlogCoverValue {
  mediaId: string | null;
  url: string | null;
  media?: MediaDto | null;
}

interface BlogCoverUploadProps {
  value: BlogCoverValue;
  onChange: (value: BlogCoverValue) => void;
  disabled?: boolean;
}

export function BlogCoverUpload({ value, onChange, disabled }: BlogCoverUploadProps) {
  const t = useTranslations("admin.blog");
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function confirmUpload() {
    if (!pendingFile) return;
    const alt = altText.trim();
    if (!alt) {
      setError(t("fields.altRequired"));
      return;
    }
    setError(null);
    try {
      const media = await upload.mutateAsync({
        file: pendingFile,
        options: { folder: MEDIA_FOLDERS.BLOG, altText: alt, title: pendingFile.name },
      });
      onChange({ mediaId: media.id, url: media.url, media });
      setPendingFile(null);
      setAltText("");
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function onPick(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
    setAltText(file.name.replace(/\.[^.]+$/, ""));
    setError(null);
  }

  return (
    <div className="flex flex-col gap-pad-atom">
      <span className="text-sm font-medium text-foreground">{t("fields.cover")}</span>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed border-white/60 bg-white/35",
          dragOver && "border-primary bg-primary/5",
          disabled && "opacity-60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPick(e.dataTransfer.files?.[0]);
        }}
      >
        {value.url ? (
          <div className="relative aspect-[16/9] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={value.media?.altText ?? ""} className="size-full object-cover" />
            {!disabled ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                className="absolute start-3 top-3"
                startIcon={<X className="size-4" />}
                onClick={() => onChange({ mediaId: null, url: null, media: null })}
              >
                {t("actions.removeCover")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 p-6 text-center">
            {upload.isPending ? (
              <Spinner />
            ) : (
              <>
                <ImageIcon className="size-8 text-muted" />
                <p className="text-sm text-muted">{t("fields.coverHint")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  startIcon={<Upload className="size-4" />}
                  onClick={() => inputRef.current?.click()}
                >
                  {t("actions.selectCover")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_UPLOAD_LIMITS.allowedMimeTypes.join(",")}
        className="hidden"
        disabled={disabled || upload.isPending}
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {pendingFile ? (
        <div className="grid gap-2 rounded-2xl border border-white/60 bg-white/40 p-3">
          <p className="text-sm text-muted">{pendingFile.name}</p>
          <Input
            label={t("fields.altText")}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void confirmUpload()} disabled={upload.isPending}>
              {t("actions.uploadCover")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setPendingFile(null);
                setAltText("");
              }}
            >
              {t("actions.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
