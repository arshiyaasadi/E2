"use client";

import { ChevronDown, ChevronUp, Star, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Spinner } from "@/components/atoms";
import { useUploadMedia } from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";
import { MEDIA_FOLDERS, MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
import type { MediaDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export interface ProductGalleryItem {
  mediaId: string;
  url: string;
  media?: MediaDto | null;
}

export interface ProductMediaGalleryProps {
  value: ProductGalleryItem[];
  onChange: (value: ProductGalleryItem[]) => void;
  folder?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function ProductMediaGallery({
  value,
  onChange,
  folder = MEDIA_FOLDERS.PRODUCTS,
  label,
  hint,
  disabled = false,
  className,
}: ProductMediaGalleryProps) {
  const t = useTranslations("admin.products.mediaGallery");
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const media = await upload.mutateAsync({ file, options: { folder, altText: file.name } });
      onChange([
        ...value,
        { mediaId: media.id, url: media.url, media },
      ]);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  const maxMb = Math.round(MEDIA_UPLOAD_LIMITS.maxBytes / (1024 * 1024));

  return (
    <div className={cn("flex flex-col gap-mol", className)}>
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}

      {value.length ? (
        <div className="grid gap-mol sm:grid-cols-2">
          {value.map((item, index) => (
            <div
              key={item.mediaId}
              className="overflow-hidden rounded-2xl border border-white/50 bg-white/35"
            >
              <div className="relative aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.media?.altText ?? ""} className="size-full object-cover" />
                {index === 0 ? (
                  <Badge variant="primary" className="absolute start-3 top-3">
                    <Star className="me-1 inline size-3" />
                    {t("featured")}
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-pad-atom border-t border-white/45 p-pad-atom">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  startIcon={<ChevronUp className="size-4" />}
                >
                  {t("moveUp")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || index === value.length - 1}
                  onClick={() => move(index, 1)}
                  startIcon={<ChevronDown className="size-4" />}
                >
                  {t("moveDown")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  startIcon={<X className="size-4" />}
                >
                  {t("remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/60 bg-white/30 p-mol-md text-center text-sm text-muted">
          {t("empty")}
        </div>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || upload.isPending}
          startIcon={upload.isPending ? <Spinner size="sm" /> : <Upload className="size-4" />}
          onClick={() => inputRef.current?.click()}
        >
          {t("addImage")}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_UPLOAD_LIMITS.allowedMimeTypes.join(",")}
          className="hidden"
          disabled={disabled || upload.isPending}
          onChange={onInputChange}
        />
        <p className="mt-pad-atom text-xs text-muted">{t("limits", { maxMb })}</p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}
    </div>
  );
}
