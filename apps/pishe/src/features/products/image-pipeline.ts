/** Client-side image normalize before upload (HEIC → JPEG, resize, size cap). */

export const IMAGE_MAX_LONG_EDGE = 2048;
export const IMAGE_TARGET_BYTES = Math.floor(1.5 * 1024 * 1024);
export const IMAGE_MAX_COUNT = 10;

const ACCEPT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const IMAGE_ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type ImagePipelineErrorCode =
  | "photoType"
  | "photoSize"
  | "photoProcess";

export class ImagePipelineError extends Error {
  code: ImagePipelineErrorCode;

  constructor(code: ImagePipelineErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

function isAcceptedInput(file: File): boolean {
  if (isHeicLike(file)) return true;
  return ACCEPT_MIME.has((file.type || "").toLowerCase());
}

async function fileToBitmapSource(file: File): Promise<Blob> {
  if (!isHeicLike(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.95,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!(blob instanceof Blob)) {
    throw new ImagePipelineError("photoProcess");
  }
  return blob;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagePipelineError("photoProcess"));
    };
    img.src = url;
  });
}

function drawToCanvas(
  img: CanvasImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImagePipelineError("photoProcess");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImagePipelineError("photoProcess"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function encodeUnderTarget(
  canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; quality: number }> {
  let quality = 0.92;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size > IMAGE_TARGET_BYTES && quality > 0.55) {
    quality = Math.max(0.55, quality - 0.07);
    blob = await canvasToBlob(canvas, quality);
  }

  if (blob.size > IMAGE_TARGET_BYTES) {
    // Last resort: shrink dimensions a bit while staying sharp enough.
    let width = canvas.width;
    let height = canvas.height;
    let current = canvas;
    let guard = 0;
    while (blob.size > IMAGE_TARGET_BYTES && guard < 4) {
      width = Math.max(640, Math.round(width * 0.85));
      height = Math.max(640, Math.round(height * 0.85));
      current = drawToCanvas(current, width, height);
      blob = await canvasToBlob(current, 0.85);
      guard += 1;
    }
  }

  return { blob, quality };
}

/**
 * Normalize a picked photo for upload: convert HEIC, cap long edge, JPEG ≤ 1.5MB.
 */
export async function normalizeProductImage(file: File): Promise<File> {
  if (!isAcceptedInput(file)) {
    throw new ImagePipelineError("photoType");
  }

  // Hard reject absurd inputs before decode (50MB).
  if (file.size > 50 * 1024 * 1024) {
    throw new ImagePipelineError("photoSize");
  }

  try {
    const source = await fileToBitmapSource(file);
    const img = await loadImage(source);

    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale =
      longEdge > IMAGE_MAX_LONG_EDGE ? IMAGE_MAX_LONG_EDGE / longEdge : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = drawToCanvas(img, width, height);
    const { blob } = await encodeUnderTarget(canvas);

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    if (err instanceof ImagePipelineError) throw err;
    throw new ImagePipelineError("photoProcess");
  }
}

export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Crop a displayed image URL/blob to JPEG under the same size rules. */
export async function cropAndNormalizeImage(
  imageSrc: string,
  crop: PixelCrop,
  rotation = 0,
): Promise<File> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new ImagePipelineError("photoProcess"));
    el.crossOrigin = "anonymous";
    el.src = imageSrc;
  });

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bw = img.naturalWidth;
  const bh = img.naturalHeight;
  const boundW = Math.ceil(bw * cos + bh * sin);
  const boundH = Math.ceil(bw * sin + bh * cos);

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = boundW;
  rotCanvas.height = boundH;
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) throw new ImagePipelineError("photoProcess");
  rotCtx.translate(boundW / 2, boundH / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(img, -bw / 2, -bh / 2);

  const cropCanvas = document.createElement("canvas");
  const longEdge = Math.max(crop.width, crop.height);
  const scale =
    longEdge > IMAGE_MAX_LONG_EDGE ? IMAGE_MAX_LONG_EDGE / longEdge : 1;
  cropCanvas.width = Math.max(1, Math.round(crop.width * scale));
  cropCanvas.height = Math.max(1, Math.round(crop.height * scale));
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new ImagePipelineError("photoProcess");
  cropCtx.drawImage(
    rotCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  );

  const { blob } = await encodeUnderTarget(cropCanvas);
  return new File([blob], `photo-${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
