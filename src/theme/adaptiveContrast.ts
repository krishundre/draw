// Samples the drawing canvas beneath a given screen-space rect and returns
// whether that region reads as visually "light" or "dark" — used to flip
// glass-panel icon/text color to stay legible over whatever's on the canvas
// behind it (like iOS Control Center / macOS menu bar over wallpaper), which
// is independent of the app's own light/dark theme setting.
export type BackgroundReading = "light" | "dark";

// The main canvas is GPU-backed (Rough.js draws to it constantly), and a
// getImageData() call on a GPU-backed canvas forces a full GPU->CPU
// synchronization — a real stall, and the cause of a measured Lighthouse TBT
// regression when several panels each read from it directly. Instead, blit
// (drawImage) just the small region we need onto a tiny *offscreen* canvas
// created with willReadFrequently, and read from that copy — drawImage
// between canvases is a cheap GPU-side blit, and reading a small
// CPU-optimized surface afterward is fast, so the expensive part (the sync
// wait) only ever applies to a few dozen pixels instead of the live canvas.
let sampleCanvas: HTMLCanvasElement | null = null;
let sampleCtx: CanvasRenderingContext2D | null = null;

const DOWNSCALE_TO = 24; // sample region is shrunk to at most this many px per side before reading

function getSampleCtx(): CanvasRenderingContext2D | null {
  if (sampleCtx) return sampleCtx;
  sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = DOWNSCALE_TO;
  sampleCanvas.height = DOWNSCALE_TO;
  sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  return sampleCtx;
}

export function sampleBackgroundReading(canvas: HTMLCanvasElement, rect: DOMRect): BackgroundReading | null {
  if (rect.width <= 0 || rect.height <= 0) return null;

  const canvasRect = canvas.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return null;
  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;

  const sx = Math.max(0, Math.round((rect.left - canvasRect.left) * scaleX));
  const sy = Math.max(0, Math.round((rect.top - canvasRect.top) * scaleY));
  const sw = Math.min(canvas.width - sx, Math.round(rect.width * scaleX));
  const sh = Math.min(canvas.height - sy, Math.round(rect.height * scaleY));
  if (sw <= 4 || sh <= 4) return null;

  const ctx = getSampleCtx();
  if (!ctx || !sampleCanvas) return null;

  try {
    // Downscale the blit itself (source rect sw×sh -> dest DOWNSCALE_TO×DOWNSCALE_TO):
    // the browser's own scaling during drawImage is effectively free GPU work
    // and gives us a cheap average-ish sample without a manual pixel loop.
    ctx.clearRect(0, 0, DOWNSCALE_TO, DOWNSCALE_TO);
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, DOWNSCALE_TO, DOWNSCALE_TO);
  } catch {
    return null; // e.g. a tainted canvas — fail closed, caller keeps the previous reading
  }

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, DOWNSCALE_TO, DOWNSCALE_TO).data;
  } catch {
    return null;
  }

  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue; // transparent — don't let it skew toward "dark"
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    count++;
  }
  if (count === 0) return "light"; // fully transparent region — canvas background shows through, treat as light by default

  const avgLuminance = sum / count;
  return avgLuminance > 150 ? "light" : "dark";
}
