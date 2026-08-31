import type { FontFamily } from "../types";

export const TEXT_CONTAINER_PADDING = 8;

export function fontStack(family: FontFamily): string {
  if (family === "hand-drawn") return '"Segoe Print", "Comic Sans MS", cursive';
  if (family === "code") return '"Cascadia Code", Consolas, monospace';
  return "Helvetica, Arial, sans-serif";
}

let measureCanvas: HTMLCanvasElement | null = null;
function measureCtx(): CanvasRenderingContext2D {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  return measureCanvas.getContext("2d")!;
}

// Greedy word-wrap: keeps the user's own line breaks as paragraph boundaries,
// then packs words within each paragraph up to maxWidth. A single word wider
// than maxWidth is hard-broken by character so it never overflows silently.
export function wrapTextToWidth(text: string, maxWidth: number, fontSize: number, family: FontFamily): string[] {
  const ctx = measureCtx();
  ctx.font = `${fontSize}px ${fontStack(family)}`;
  const width = Math.max(1, maxWidth);
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      if (ctx.measureText(word).width <= width) {
        current = word;
        continue;
      }
      // the word itself is wider than the wrap width — hard-break by character
      let piece = "";
      for (const ch of word) {
        const test = piece + ch;
        if (ctx.measureText(test).width <= width || !piece) {
          piece = test;
        } else {
          lines.push(piece);
          piece = ch;
        }
      }
      current = piece;
    }
    lines.push(current);
  }
  return lines;
}

// Where a text element bound to `container` (via containerId) should sit —
// centered within it, wrapped to the container's inner width. Pure function:
// callers decide when to apply the result and whether to grow the container.
export function layoutBoundText(
  container: { x: number; y: number; width: number; height: number },
  text: string,
  fontSize: number,
  family: FontFamily
): { x: number; y: number; width: number; height: number } {
  const wrapWidth = Math.max(20, container.width - TEXT_CONTAINER_PADDING * 2);
  const lines = wrapTextToWidth(text, wrapWidth, fontSize, family);
  const height = Math.max(lines.length * fontSize * 1.25, fontSize * 1.25);
  const cx = container.x + container.width / 2;
  const cy = container.y + container.height / 2;
  return { x: cx - wrapWidth / 2, y: cy - height / 2, width: wrapWidth, height };
}
