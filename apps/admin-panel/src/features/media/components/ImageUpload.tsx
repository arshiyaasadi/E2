"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, Button, Spinner } from "@/components/atoms";
import { useUploadMedia } from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";
import { MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
import type { MediaDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface ImageUploadValue {
  mediaId: string | null;
  url: string | null;
  media?: MediaDto | null;
}

export interface ImageUploadProps {
  value: ImageUploadValue;
  onChange: (value: ImageUploadValue) => void;
  folder?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** When true, prompt for alt text before upload completes */
  requireAltText?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  folder = "general",
  label,
  hint,
  disabled = false,
  className,
  requireAltText = false,
}: ImageUploadProps) {
  const t = useTranslations("admin.media");
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      let altText = file.name;
      if (requireAltText) {
        const entered = window.prompt("Alt text (required)", file.name)?.trim();
        if (!entered) {
          setError("Alt text is required");
          return;
        }
        altText = entered;
      }
      const media = await upload.mutateAsync({ file, options: { folder, altText } });
      onChange({ mediaId: media.id, url: media.url, media });
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function clearImage() {
    onChange({ mediaId: null, url: null, media: null });
    setError(null);
  }

  const maxMb = Math.round(MEDIA_UPLOAD_LIMITS.maxBytes / (1024 * 1024));

  return (
    <div className={cn("flex flex-col gap-pad-atom", className)}>
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed border-white/60 bg-white/35",
          disabled && "opacity-60",
        )}
      >
        {value.url ? (
          <div className="relative aspect-[16/10] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={value.media?.altText ?? ""} className="size-full object-cover" />
            {!disabled ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                className="absolute start-3 top-3"
                startIcon={<X className="size-4" />}
                onClick={clearImage}
              >
                {t("remove")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex aspect-[16/10] flex-col items-center justify-center gap-pad-atom-md p-mol-md text-center">
            {upload.isPending ? (
              <Spinner />
            ) : (
              <>
                <div className="rounded-2xl bg-white/55 p-pad-mol text-muted">
                  <ImageIcon className="size-8" />
                </div>
                <p className="text-sm text-muted">{t("dropHint")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || upload.isPending}
                  startIcon={<Upload className="size-4" />}
                  onClick={() => inputRef.current?.click()}
                >
                  {t("selectFile")}
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
        onChange={onInputChange}
      />

      <p className="text-xs text-muted">
        {hint ?? t("limits", { maxMb })}
      </p>

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
