"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Check, Maximize2, RotateCcw, RotateCw, Square, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Spinner } from "@/components/atoms/Spinner";
import {
  cropAndNormalizeImage,
  ImagePipelineError,
} from "@/features/media/image-pipeline";

export function PhotoEditor({
  open,
  imageSrc,
  onClose,
  onSave,
}: {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const t = useTranslations("products.form");
  const tErr = useTranslations("products.errors");
  const [mounted, setMounted] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(1);
    setCroppedAreaPixels(null);
    setError(null);
    setSaving(false);
  }, [open, imageSrc]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!open || !mounted) return null;

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const file = await cropAndNormalizeImage(
        imageSrc,
        croppedAreaPixels,
        rotation,
      );
      await onSave(file);
      onClose();
    } catch (err) {
      if (err instanceof ImagePipelineError) {
        setError(tErr(err.code));
      } else {
        setError(tErr("photoProcess"));
      }
    } finally {
      setSaving(false);
    }
  }

  function resetView() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={t("editPhoto")}
      className="fixed inset-0 z-[200] flex h-dvh w-screen flex-col bg-black"
    >
      <header className="flex shrink-0 items-center justify-between gap-mol px-pad-mol pb-pad-atom pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          onClick={onClose}
          disabled={saving}
          aria-label={t("cancelEdit")}
        >
          <X className="size-5" aria-hidden />
        </Button>
        <h2 className="text-sm font-semibold">{t("editPhoto")}</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10"
          onClick={() => void handleSave()}
          disabled={saving || !croppedAreaPixels}
          aria-label={t("saveEdit")}
        >
          {saving ? (
            <Spinner className="size-5 text-white" />
          ) : (
            <Check className="size-5" aria-hidden />
          )}
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          objectFit="contain"
        />
      </div>

      <footer className="flex shrink-0 flex-col gap-mol px-pad-mol pb-[max(1rem,env(safe-area-inset-bottom))] pt-pad-mol text-white">
        {error ? (
          <p className="text-center text-sm text-danger">{error}</p>
        ) : null}
        <div className="flex items-center gap-mol">
          <label className="shrink-0 text-xs text-white/80">{t("zoom")}</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-white"
            aria-label={t("zoom")}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-atom-md">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            disabled={saving}
          >
            <RotateCw className="size-4" aria-hidden />
            {t("rotate")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={() => setAspect((a) => (a === 1 ? undefined : 1))}
            disabled={saving}
          >
            {aspect === 1 ? (
              <Maximize2 className="size-4" aria-hidden />
            ) : (
              <Square className="size-4" aria-hidden />
            )}
            {aspect === 1 ? t("aspectFree") : t("aspectSquare")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            onClick={resetView}
            disabled={saving}
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("resetEdit")}
          </Button>
        </div>
      </footer>
    </div>,
    document.body,
  );
}

/** @deprecated Use PhotoEditor */
export { PhotoEditor as PhotoEditModal };
