"use client";

import { ChevronDown, ChevronUp, Images, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@/components/atoms";
import { useMediaList, useUploadMedia } from "@/features/media/queries";
import { handleApiError } from "@/lib/api/client";
import { MEDIA_FOLDERS, MEDIA_UPLOAD_LIMITS } from "@/lib/media/constants";
import type { MediaDto } from "@/types/domain";
import { cn } from "@/lib/utils";

export type CategoryGalleryItem = {
  mediaId: string;
  url: string;
  media?: MediaDto | null;
};

export function CategoryGalleryField({
  value,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  value: CategoryGalleryItem[];
  onChange: (value: CategoryGalleryItem[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMedia();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data: mediaList, isLoading: mediaLoading } = useMediaList({
    folder: MEDIA_FOLDERS.CATEGORIES,
    limit: "48",
  });

  async function handleFile(file: File) {
    setError(null);
    try {
      const media = await upload.mutateAsync({
        file,
        options: { folder: MEDIA_FOLDERS.CATEGORIES, altText: file.name },
      });
      onChange([...value, { mediaId: media.id, url: media.url, media }]);
    } catch (err) {
      setError(handleApiError(err));
    }
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  function applyPicker() {
    const existing = new Set(value.map((v) => v.mediaId));
    const items = (mediaList?.items ?? []).filter(
      (m) => picked.has(m.id) && !existing.has(m.id),
    );
    onChange([
      ...value,
      ...items.map((m) => ({ mediaId: m.id, url: m.url, media: m })),
    ]);
    setPicked(new Set());
    setPickerOpen(false);
  }

  const maxMb = Math.round(MEDIA_UPLOAD_LIMITS.maxBytes / (1024 * 1024));

  return (
    <div className="flex flex-col gap-mol">
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
                <img src={item.url} alt="" className="size-full object-cover" />
                {index === 0 ? (
                  <Badge variant="primary" className="absolute start-3 top-3">
                    شاخص
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-pad-atom border-t border-white/45 p-pad-atom">
                <Button type="button" size="sm" variant="outline" disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled || index === value.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">هنوز تصویری اضافه نشده</p>
      )}

      <div className="flex flex-wrap gap-pad-atom">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || upload.isPending}
          startIcon={upload.isPending ? <Spinner size="sm" /> : <Upload className="size-4" />}
          onClick={() => inputRef.current?.click()}
        >
          آپلود
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          startIcon={<Images className="size-4" />}
          onClick={() => setPickerOpen(true)}
        >
          از گالری
        </Button>
      </div>
      <p className="text-[11px] text-muted">حداکثر {maxMb}MB — بعد از انتخاب می‌توانید ترتیب را عوض کنید</p>
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="انتخاب از گالری" size="xl">
        <ModalBody>
          {mediaLoading ? (
            <div className="flex justify-center py-mol-lg">
              <Spinner />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-pad-atom sm:grid-cols-3 md:grid-cols-4">
              {(mediaList?.items ?? []).map((media) => {
                const active = picked.has(media.id);
                return (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => {
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (next.has(media.id)) next.delete(media.id);
                        else next.add(media.id);
                        return next;
                      });
                    }}
                    className={cn(
                      "overflow-hidden rounded-xl border ring-2 transition",
                      active ? "ring-primary" : "ring-transparent border-white/50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.thumbUrl || media.url} alt="" className="aspect-square w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPickerOpen(false)}>
            انصراف
          </Button>
          <Button onClick={applyPicker} disabled={!picked.size}>
            افزودن ({picked.size})
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
