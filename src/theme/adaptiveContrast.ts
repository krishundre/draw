// Samples the drawing canvas beneath a given screen-space rect and returns
// whether that region reads as visually "light" or "dark" — used to flip
// glass-panel icon/text color to stay legible over whatever's on the canvas
// behind it (like iOS Control Center / macOS menu bar over wallpaper), which
// is independent of the app's own light/dark theme setting.
export type BackgroundReading = "light" | "dark";

// Reads getImageData at a coarse stride rather than every pixel — this is a
// downsample, not a full-resolution scan, which keeps a call cheap enough to
// run on every settle event (see useAdaptiveContrast) without it becoming a
// perf problem. A panel-sized region (a few hundred px) at 1 sample per 8th
// pixel is a few thousand reads at most.
const SAMPLE_STRIDE = 8;

export function sampleBackgroundReading(canvas: HTMLCanvasElement, rect: DOMRect): BackgroundReading | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return null;
  // canvas.width/height are device-pixel-ratio-scaled (see Canvas.tsx's draw());
  // canvasRect is in CSS pixels, so this ratio converts screen coords -> canvas
  // pixel coords without assuming devicePixelRatio directly (more robust if the
  // canvas is ever transformed/scaled by the layout).
  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;

  const x = Math.max(0, Math.round((rect.left - canvasRect.left) * scaleX));
  const y = Math.max(0, Math.round((rect.top - canvasRect.top) * scaleY));
  const w = Math.min(canvas.width - x, Math.round(rect.width * scaleX));
  const h = Math.min(canvas.height - y, Math.round(rect.height * scaleY));
  if (w <= 4 || h <= 4) return null;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x, y, w, h).data;
  } catch {
    return null; // e.g. a tainted canvas — fail closed, caller keeps the previous reading
  }

  let sum = 0;
  let count = 0;
  const rowStride = SAMPLE_STRIDE * 4;
  const rowSkip = SAMPLE_STRIDE; // sample every Nth row too, not just every Nth pixel in a row
  for (let row = 0; row < h; row += rowSkip) {
    const rowStart = row * w * 4;
    for (let i = rowStart; i < rowStart + w * 4; i += rowStride) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue; // transparent — don't let it skew toward "dark"
      // perceptual luminance (Rec. 709)
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      count++;
    }
  }
  if (count === 0) return "light"; // fully transparent region — canvas background shows through, treat as light by default

  const avgLuminance = sum / count;
  return avgLuminance > 150 ? "light" : "dark";
}
