"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, X } from "lucide-react";
import { Spinner } from "@/components/atoms/Spinner";
import { PhotoEditor } from "@/features/media/components/PhotoEditor";
import {
  IMAGE_ACCEPT_ATTR,
  ImagePipelineError,
  normalizeProductImage,
} from "@/features/media/image-pipeline";
import { useUploadMediaMutation } from "@/features/products/queries";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export function SingleImageField({
  imageId,
  imageUrl,
  onChange,
}: {
  imageId: string | null;
  imageUrl: string | null;
  onChange: (next: { imageId: string | null; imageUrl: string | null }) => void;
}) {
  const t = useTranslations("products.form");
  const tErr = useTranslations("products.errors");
  const upload = useUploadMediaMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const displayUrl = preview || imageUrl;

  async function processFile(raw: File) {
    setBusy(true);
    setError(null);
    try {
      const normalized = await normalizeProductImage(raw);
      const local = URL.createObjectURL(normalized);
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(local);
      const result = await upload.mutateAsync(normalized);
      onChange({ imageId: result.fileId, imageUrl: result.url });
    } catch (err) {
      if (err instanceof ImagePipelineError) {
        setError(tErr(err.code));
      } else {
        setError(handleApiError(err) || tErr("uploadFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-atom">
      <div className="relative aspect-square w-full max-w-[10rem] overflow-hidden rounded-2xl border border-border bg-surface-2">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            className="flex size-full flex-col items-center justify-center gap-atom text-muted"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <Spinner className="size-5" />
            ) : (
              <Plus className="size-7" aria-hidden />
            )}
            <span className="text-[10px]">{t("addPhoto")}</span>
          </button>
        )}

        {busy && displayUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Spinner className="size-5 text-white" />
          </div>
        ) : null}

        {displayUrl && !busy ? (
          <>
            <button
              type="button"
              className="absolute end-1 top-1 rounded-full bg-black/55 p-0.5 text-white"
              onClick={() => {
                if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
                setPreview(null);
                onChange({ imageId: null, imageUrl: null });
              }}
              aria-label={t("removePhoto")}
            >
              <X className="size-3.5" />
            </button>
            <button
              type="button"
              className="absolute bottom-1 end-1 rounded-full bg-black/55 p-0.5 text-white"
              onClick={() => setEditing(true)}
              aria-label={t("editPhoto")}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                "absolute bottom-1 start-1 rounded-full bg-black/55 px-pad-atom py-0.5 text-[10px] text-white",
              )}
              onClick={() => inputRef.current?.click()}
            >
              {t("pickPhotos")}
            </button>
          </>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processFile(file);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <PhotoEditor
        open={editing && Boolean(displayUrl)}
        imageSrc={displayUrl || ""}
        onClose={() => setEditing(false)}
        onSave={async (file) => {
          setBusy(true);
          try {
            const local = URL.createObjectURL(file);
            if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
            setPreview(local);
            const result = await upload.mutateAsync(file);
            onChange({ imageId: result.fileId, imageUrl: result.url });
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
