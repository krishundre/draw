import rough from "roughjs";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type {
  WhiteboardElement,
  ArrowElement,
  LineElement,
  DrawElement,
  TextElement,
  ImageElement,
  FrameElement,
  ArrowheadStyle,
  Roughness,
  StrokeWidth,
  StrokeStyle,
} from "../types";
import { getStroke } from "perfect-freehand";

const imageCache = new Map<string, HTMLImageElement>();

function roughnessValue(r: Roughness): number {
  return r === "architect" ? 0.5 : r === "artist" ? 1.2 : 2.5;
}
function strokeWidthValue(w: StrokeWidth): number {
  return w === "thin" ? 1 : w === "bold" ? 2.5 : 4;
}
function strokeDashArray(s: StrokeStyle): number[] | undefined {
  if (s === "dashed") return [8, 6];
  if (s === "dotted") return [2, 6];
  return undefined;
}

function roughOptions(el: WhiteboardElement) {
  return {
    stroke: el.strokeColor,
    fill: el.backgroundColor === "transparent" ? undefined : el.backgroundColor,
    fillStyle: el.fillStyle,
    strokeWidth: strokeWidthValue(el.strokeWidth),
    roughness: roughnessValue(el.roughness),
    seed: el.seed,
    strokeLineDash: strokeDashArray(el.strokeStyle),
    curveFitting: 0.95,
  };
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  elements: WhiteboardElement[],
  opts: { scrollX: number; scrollY: number; zoom: number; background: string; width: number; height: number; grid: boolean; theme: "light" | "dark" }
) {
  const rc = rough.canvas(ctx.canvas);
  ctx.save();
  ctx.clearRect(0, 0, opts.width, opts.height);
  ctx.fillStyle = opts.background;
  ctx.fillRect(0, 0, opts.width, opts.height);

  ctx.translate(opts.scrollX, opts.scrollY);
  ctx.scale(opts.zoom, opts.zoom);

  if (opts.grid) drawGrid(ctx, opts);

  for (const el of elements) {
    if (el.isDeleted) continue;
    ctx.save();
    ctx.globalAlpha = el.opacity / 100;
    if (el.angle) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(el.angle);
      ctx.translate(-cx, -cy);
    }
    drawElement(rc, ctx, el);
    ctx.restore();
  }

  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, opts: { scrollX: number; scrollY: number; zoom: number; width: number; height: number }) {
  const gridSize = 20;
  ctx.save();
  ctx.strokeStyle = "rgba(128,128,128,0.15)";
  ctx.lineWidth = 1 / opts.zoom;
  const startX = -opts.scrollX / opts.zoom;
  const startY = -opts.scrollY / opts.zoom;
  const endX = startX + opts.width / opts.zoom;
  const endY = startY + opts.height / opts.zoom;
  const firstX = Math.floor(startX / gridSize) * gridSize;
  const firstY = Math.floor(startY / gridSize) * gridSize;
  ctx.beginPath();
  for (let x = firstX; x < endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = firstY; y < endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawElement(rc: RoughCanvas, ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const opts = roughOptions(el);
  const radius = el.edges === "round" ? Math.min(el.width, el.height) * 0.15 : 0;

  switch (el.type) {
    case "rectangle": {
      if (radius > 0) {
        rc.path(roundedRectPath(el.x, el.y, el.width, el.height, radius), opts);
      } else {
        rc.rectangle(el.x, el.y, el.width, el.height, opts);
      }
      break;
    }
    case "diamond": {
      const { x, y, width: w, height: h } = el;
      rc.polygon(
        [
          [x + w / 2, y],
          [x + w, y + h / 2],
          [x + w / 2, y + h],
          [x, y + h / 2],
        ],
        opts
      );
      break;
    }
    case "ellipse": {
      rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, opts);
      break;
    }
    case "frame": {
      const fr = el as FrameElement;
      ctx.save();
      ctx.strokeStyle = "#868e96";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(fr.x, fr.y, fr.width, fr.height);
      ctx.fillStyle = "#868e96";
      ctx.font = "12px sans-serif";
      ctx.fillText(fr.name || "Frame", fr.x, fr.y - 6);
      ctx.restore();
      break;
    }
    case "line": {
      const l = el as LineElement;
      const pts = l.points.map((p) => [l.x + p.x, l.y + p.y]) as [number, number][];
      rc.linearPath(pts, opts);
      break;
    }
    case "arrow": {
      const a = el as ArrowElement;
      drawArrow(rc, ctx, a, opts);
      break;
    }
    case "draw": {
      const d = el as DrawElement;
      drawFreehand(ctx, d);
      break;
    }
    case "text": {
      drawText(ctx, el as TextElement);
      break;
    }
    case "image": {
      drawImage(ctx, el as ImageElement);
      break;
    }
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.min(r, w / 2, h / 2);
  return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

function drawArrow(rc: RoughCanvas, ctx: CanvasRenderingContext2D, a: ArrowElement, opts: ReturnType<typeof roughOptions>) {
  const pts = a.points.map((p) => [a.x + p.x, a.y + p.y]) as [number, number][];
  if (pts.length < 2) return;
  rc.linearPath(pts, opts);
  const end = pts[pts.length - 1];
  const beforeEnd = pts[pts.length - 2];
  const start = pts[0];
  const afterStart = pts[1];
  if (a.endArrowhead !== "none") drawArrowhead(rc, ctx, beforeEnd, end, a.endArrowhead, opts, a.strokeColor);
  if (a.startArrowhead !== "none") drawArrowhead(rc, ctx, afterStart, start, a.startArrowhead, opts, a.strokeColor);
}

function drawArrowhead(
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  style: ArrowheadStyle,
  opts: ReturnType<typeof roughOptions>,
  color: string
) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = 16;
  if (style === "dot") {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(to[0], to[1], 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (style === "bar") {
    const perp = angle + Math.PI / 2;
    const p1: [number, number] = [to[0] + Math.cos(perp) * 8, to[1] + Math.sin(perp) * 8];
    const p2: [number, number] = [to[0] - Math.cos(perp) * 8, to[1] - Math.sin(perp) * 8];
    rc.line(p1[0], p1[1], p2[0], p2[1], opts);
    return;
  }
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  const p1: [number, number] = [to[0] + Math.cos(a1) * size, to[1] + Math.sin(a1) * size];
  const p2: [number, number] = [to[0] + Math.cos(a2) * size, to[1] + Math.sin(a2) * size];
  if (style === "triangle") {
    rc.polygon([to, p1, p2], { ...opts, fill: color, fillStyle: "solid" });
  } else {
    rc.line(to[0], to[1], p1[0], p1[1], opts);
    rc.line(to[0], to[1], p2[0], p2[1], opts);
  }
}

function drawFreehand(ctx: CanvasRenderingContext2D, d: DrawElement) {
  const inputPoints = d.points.map((p) => [p.x, p.y] as [number, number]);
  const stroke = getStroke(inputPoints, {
    size: strokeWidthValue(d.strokeWidth) * 4 + 2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
  });
  if (!stroke.length) return;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.fillStyle = d.strokeColor;
  ctx.beginPath();
  ctx.moveTo(stroke[0][0], stroke[0][1]);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0], stroke[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fontStack(family: TextElement["fontFamily"]): string {
  if (family === "hand-drawn") return '"Segoe Print", "Comic Sans MS", cursive';
  if (family === "code") return '"Cascadia Code", Consolas, monospace';
  return "Helvetica, Arial, sans-serif";
}

export function measureText(text: string, fontSize: number, family: TextElement["fontFamily"]) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${fontSize}px ${fontStack(family)}`;
  const lines = text.split("\n");
  const width = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
  const height = lines.length * fontSize * 1.25;
  return { width, height };
}

function drawText(ctx: CanvasRenderingContext2D, t: TextElement) {
  ctx.save();
  ctx.fillStyle = t.strokeColor;
  ctx.font = `${t.fontSize}px ${fontStack(t.fontFamily)}`;
  ctx.textAlign = t.textAlign;
  ctx.textBaseline = "top";
  const lineHeight = t.fontSize * 1.25;
  const lines = t.text.split("\n");
  const anchorX = t.textAlign === "left" ? t.x : t.textAlign === "right" ? t.x + t.width : t.x + t.width / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, anchorX, t.y + i * lineHeight);
  });
  ctx.restore();
}

function drawImage(ctx: CanvasRenderingContext2D, img: ImageElement) {
  let image = imageCache.get(img.fileId);
  if (!image) {
    image = new Image();
    image.src = img.dataURL;
    imageCache.set(img.fileId, image);
  }
  if (image.complete) {
    ctx.drawImage(image, img.x, img.y, img.width, img.height);
  }
}
