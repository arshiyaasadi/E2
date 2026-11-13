"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Home, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { Spinner } from "@/components/atoms/Spinner";
import { PhotoEditor } from "@/features/media/components/PhotoEditor";
import {
  IMAGE_ACCEPT_ATTR,
  IMAGE_MAX_COUNT,
  ImagePipelineError,
  normalizeProductImage,
} from "@/features/media/image-pipeline";
import { useUploadMediaMutation } from "@/features/products/queries";
import { handleApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export type PhotoItem = {
  localId: string;
  fileId?: string;
  url?: string;
  localPreview: string;
  status: "uploading" | "ready" | "error";
  error?: string;
  file?: File;
};

export type PhotoListChange = (
  next: PhotoItem[] | ((prev: PhotoItem[]) => PhotoItem[]),
) => void;

function newLocalId() {
  return crypto.randomUUID();
}

export function readyMediaIds(photos: PhotoItem[]): string[] {
  return photos
    .filter((p) => p.status === "ready" && p.fileId)
    .map((p) => p.fileId!);
}

export function PhotoUploader({
  photos,
  onChange,
  max = IMAGE_MAX_COUNT,
  error,
  mock = false,
}: {
  photos: PhotoItem[];
  onChange: PhotoListChange;
  max?: number;
  error?: string | null;
  /** Skip file-service; keep local blob previews with fake fileIds. */
  mock?: boolean;
}) {
  const t = useTranslations("products.form");
  const tErr = useTranslations("products.errors");
  const upload = useUploadMediaMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PhotoItem | null>(null);

  async function uploadSlot(localId: string, file: File) {
    if (mock) {
      const preview = URL.createObjectURL(file);
      onChange((list) =>
        list.map((p) => {
          if (p.localId !== localId) return p;
          if (p.localPreview?.startsWith("blob:") && p.localPreview !== preview) {
            URL.revokeObjectURL(p.localPreview);
          }
          return {
            ...p,
            fileId: p.fileId ?? crypto.randomUUID(),
            localPreview: preview,
            url: preview,
            status: "ready" as const,
            error: undefined,
            file,
          };
        }),
      );
      return;
    }

    onChange((list) =>
      list.map((p) =>
        p.localId === localId
          ? { ...p, status: "uploading", error: undefined, file }
          : p,
      ),
    );

    try {
      const result = await upload.mutateAsync(file);
      onChange((list) =>
        list.map((p) =>
          p.localId === localId
            ? {
                ...p,
                fileId: result.fileId,
                url: result.url,
                status: "ready",
                error: undefined,
                file: undefined,
              }
            : p,
        ),
      );
    } catch (err) {
      onChange((list) =>
        list.map((p) =>
          p.localId === localId
            ? {
                ...p,
                status: "error",
                error: handleApiError(err) || tErr("uploadFailed"),
                file,
              }
            : p,
        ),
      );
    }
  }

  async function prepareAndUpload(localId: string, raw: File) {
    try {
      const normalized = await normalizeProductImage(raw);
      const preview = URL.createObjectURL(normalized);
      onChange((list) =>
        list.map((p) => {
          if (p.localId !== localId) return p;
          if (p.localPreview?.startsWith("blob:")) {
            URL.revokeObjectURL(p.localPreview);
          }
          return {
            ...p,
            localPreview: preview,
            file: normalized,
            status: mock ? ("ready" as const) : ("uploading" as const),
            fileId: mock ? (p.fileId ?? crypto.randomUUID()) : p.fileId,
            url: mock ? preview : p.url,
            error: undefined,
          };
        }),
      );
      if (!mock) {
        await uploadSlot(localId, normalized);
      }
    } catch (err) {
      const code =
        err instanceof ImagePipelineError ? err.code : "photoProcess";
      onChange((list) =>
        list.map((p) =>
          p.localId === localId
            ? {
                ...p,
                status: "error",
                error: tErr(code),
                file: raw,
              }
            : p,
        ),
      );
    }
  }

  async function enqueueFiles(list: FileList | File[]) {
    setLocalError(null);
    const files = Array.from(list);
    if (!files.length) return;

    const remaining = max - photos.length;
    if (remaining <= 0) {
      setLocalError(tErr("photoMax"));
      return;
    }

    const accepted = files.slice(0, remaining);
    const slots: PhotoItem[] = accepted.map((file) => ({
      localId: newLocalId(),
      localPreview: URL.createObjectURL(file),
      status: (mock ? "ready" : "uploading") as PhotoItem["status"],
      fileId: mock ? crypto.randomUUID() : undefined,
      url: mock ? undefined : undefined,
      file,
    }));

    if (mock) {
      onChange((prev) =>
        [
          ...prev,
          ...slots.map((s) => ({
            ...s,
            url: s.localPreview,
            status: "ready" as const,
          })),
        ].slice(0, max),
      );
      for (const slot of slots) {
        if (slot.file) await prepareAndUpload(slot.localId, slot.file);
      }
      return;
    }

    onChange((prev) => [...prev, ...slots].slice(0, max));

    for (const slot of slots) {
      if (slot.file) await prepareAndUpload(slot.localId, slot.file);
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    onChange((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  }

  function removeAt(index: number) {
    onChange((prev) => {
      const target = prev[index];
      if (target?.localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(target.localPreview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function applyEdited(localId: string, file: File) {
    const preview = URL.createObjectURL(file);
    onChange((list) =>
      list.map((p) => {
        if (p.localId !== localId) return p;
        if (p.localPreview?.startsWith("blob:")) {
          URL.revokeObjectURL(p.localPreview);
        }
        return {
          ...p,
          localPreview: preview,
          file,
          fileId: mock ? (p.fileId ?? crypto.randomUUID()) : undefined,
          url: mock ? preview : undefined,
          status: mock ? ("ready" as const) : ("uploading" as const),
          error: undefined,
        };
      }),
    );
    if (!mock) {
      await uploadSlot(localId, file);
    }
  }

  const displayError = error || localError;
  const canAdd = photos.length < max;

  return (
    <div className="flex flex-col gap-mol">
      <ul className="-m-px grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface">
        {photos.map((photo, index) => (
          <li
            key={photo.localId}
            draggable={photo.status === "ready"}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null) return;
              reorder(dragIndex, index);
              setDragIndex(null);
            }}
            className={cn(
              "relative aspect-square overflow-hidden border border-border bg-surface-2",
              dragIndex === index && "opacity-60",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.localPreview || photo.url || ""}
              alt=""
              className="size-full object-cover"
            />

            {photo.status === "uploading" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-atom bg-black/55 px-1 text-center text-white">
                <Spinner className="size-5 text-white" />
                <span className="text-[10px]">{t("uploading")}</span>
              </div>
            ) : null}

            {photo.status === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-atom bg-black/65 px-1 text-center">
                <p className="line-clamp-2 text-[10px] text-white">
                  {photo.error || tErr("uploadFailed")}
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-atom rounded-full bg-white/15 px-pad-atom py-1 text-xs text-white"
                  onClick={() => {
                    if (photo.file)
                      void prepareAndUpload(photo.localId, photo.file);
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  {t("retryUpload")}
                </button>
              </div>
            ) : null}

            {photo.status === "ready" ? (
              <>
                <button
                  type="button"
                  title={t("setCover")}
                  className={cn(
                    "absolute start-2 top-2 rounded-lg p-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]",
                    index === 0
                      ? "text-warning"
                      : "text-white hover:text-warning",
                  )}
                  onClick={() => setAsCover(index)}
                >
                  <Home
                    className={cn("size-5", index === 0 && "fill-current")}
                    aria-label={index === 0 ? t("coverStar") : t("setCover")}
                  />
                </button>
                <button
                  type="button"
                  className="absolute bottom-2 end-2 rounded-full p-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-primary-100"
                  onClick={() => setEditing(photo)}
                  aria-label={t("editPhoto")}
                >
                  <Pencil className="size-5" aria-hidden />
                </button>
              </>
            ) : null}

            <button
              type="button"
              className="absolute end-2 top-2 rounded-full p-2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] hover:text-danger"
              onClick={() => removeAt(index)}
              aria-label={t("removePhoto")}
            >
              <X className="size-5" />
            </button>
          </li>
        ))}

        {canAdd ? (
          <li className="border border-border bg-surface-2">
            <button
              type="button"
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center gap-atom-md transition-colors",
                dragOver
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface hover:text-accent",
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void enqueueFiles(e.dataTransfer.files);
              }}
              aria-label={t("addPhoto")}
            >
              <Plus className="size-10" aria-hidden />
              <span className="px-1 text-xs leading-tight">
                {dragOver ? t("dropActive") : t("addPhoto")}
              </span>
            </button>
          </li>
        ) : null}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void enqueueFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {displayError ? <p className="text-sm text-danger">{displayError}</p> : null}

      <PhotoEditor
        open={Boolean(editing)}
        imageSrc={editing?.localPreview || editing?.url || ""}
        onClose={() => setEditing(null)}
        onSave={async (file) => {
          if (!editing) return;
          await applyEdited(editing.localId, file);
        }}
      />
    </div>
  );
}
