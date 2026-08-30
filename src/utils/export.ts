import { renderScene } from "../canvas/render";
import { getCombinedBounds } from "../canvas/geometry";
import type { WhiteboardElement } from "../types";

const APP_VERSION = "1.0.0";

export interface ExcalidrawFile {
  type: "drawboard";
  version: string;
  elements: WhiteboardElement[];
  appState: { canvasBackground: string };
}

export function exportToJSON(elements: WhiteboardElement[], canvasBackground: string): string {
  const file: ExcalidrawFile = { type: "drawboard", version: APP_VERSION, elements, appState: { canvasBackground } };
  return JSON.stringify(file, null, 2);
}

export function downloadFile(content: string | Blob, filename: string) {
  const blob = typeof content === "string" ? new Blob([content], { type: "application/octet-stream" }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderToCanvas(
  elements: WhiteboardElement[],
  opts: { background: string; scale: number; transparent: boolean }
): HTMLCanvasElement {
  const bounds = getCombinedBounds(elements);
  const pad = 20;
  const width = bounds.x2 - bounds.x1 + pad * 2;
  const height = bounds.y2 - bounds.y1 + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * opts.scale;
  canvas.height = height * opts.scale;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
  renderScene(ctx, elements, {
    scrollX: -bounds.x1 + pad,
    scrollY: -bounds.y1 + pad,
    zoom: 1,
    background: opts.transparent ? "rgba(0,0,0,0)" : opts.background,
    width,
    height,
    grid: false,
    theme: "light",
  });
  return canvas;
}

export function exportToPNG(elements: WhiteboardElement[], opts: { background: string; scale: number; transparent: boolean }): Promise<Blob> {
  const canvas = renderToCanvas(elements, opts);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export async function copyPNGToClipboard(elements: WhiteboardElement[], opts: { background: string; scale: number; transparent: boolean }) {
  const blob = await exportToPNG(elements, opts);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export function exportToSVG(elements: WhiteboardElement[], opts: { background: string; transparent: boolean }): string {
  const canvas = renderToCanvas(elements, { ...opts, scale: 1 });
  const dataURL = canvas.toDataURL("image/png");
  const bounds = getCombinedBounds(elements);
  const pad = 20;
  const width = bounds.x2 - bounds.x1 + pad * 2;
  const height = bounds.y2 - bounds.y1 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${dataURL}" width="${width}" height="${height}"/></svg>`;
}

export function parseImportedFile(text: string): ExcalidrawFile {
  const data = JSON.parse(text);
  if (!Array.isArray(data.elements)) throw new Error("Invalid file: missing elements array");
  return data;
}
