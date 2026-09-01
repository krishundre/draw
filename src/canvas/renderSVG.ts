import rough from "roughjs";
import { getStroke } from "perfect-freehand";
import type {
  ArrowElement,
  ArrowheadStyle,
  DrawElement,
  EmbedElement,
  FrameElement,
  ImageElement,
  LineElement,
  TextElement,
  WhiteboardElement,
} from "../types";
import { getCombinedBounds } from "./geometry";
import { roughOptions, roundedRectPath, strokeWidthValue, getCachedImage } from "./render";
import { fontStack, wrapTextToWidth } from "./text";
import { computeElbowPoints } from "./elbow";
import { embedHostLabel } from "../utils/embedAllowlist";

const SVG_NS = "http://www.w3.org/2000/svg";

// A real vector SVG exporter (rough.svg mirrors rough.canvas's API but returns
// SVG elements instead of drawing to a canvas), replacing the old
// rasterize-to-PNG-then-wrap-in-<image> approach — shapes, lines, and text
// come out as actual <path>/<text> elements, editable in any vector tool.
// Raster images stay raster (there's no vector source to recover), which
// matches how every SVG exporter — including Excalidraw's — handles them.
export function renderSceneToSVGString(elements: WhiteboardElement[], opts: { background: string; transparent: boolean }): string {
  const bounds = getCombinedBounds(elements);
  const pad = 20;
  const width = bounds.x2 - bounds.x1 + pad * 2;
  const height = bounds.y2 - bounds.y1 + pad * 2;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (!opts.transparent) {
    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", opts.background);
    svg.appendChild(bg);
  }

  const rc = rough.svg(svg);
  const root = document.createElementNS(SVG_NS, "g");
  root.setAttribute("transform", `translate(${-bounds.x1 + pad}, ${-bounds.y1 + pad})`);
  svg.appendChild(root);

  for (const el of elements) {
    if (el.isDeleted) continue;
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("opacity", String(el.opacity / 100));
    if (el.angle) {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      g.setAttribute("transform", `rotate(${(el.angle * 180) / Math.PI} ${cx} ${cy})`);
    }
    appendElement(rc, g, el);
    root.appendChild(g);
  }

  return new XMLSerializer().serializeToString(svg);
}

function appendElement(rc: ReturnType<typeof rough.svg>, g: SVGGElement, el: WhiteboardElement) {
  const opts = roughOptions(el);
  const radius = el.edges === "round" ? Math.min(el.width, el.height) * 0.15 : 0;

  switch (el.type) {
    case "rectangle": {
      const node = radius > 0 ? rc.path(roundedRectPath(el.x, el.y, el.width, el.height, radius), opts) : rc.rectangle(el.x, el.y, el.width, el.height, opts);
      g.appendChild(node);
      break;
    }
    case "diamond": {
      const { x, y, width: w, height: h } = el;
      g.appendChild(
        rc.polygon(
          [
            [x + w / 2, y],
            [x + w, y + h / 2],
            [x + w / 2, y + h],
            [x, y + h / 2],
          ],
          opts
        )
      );
      break;
    }
    case "ellipse": {
      g.appendChild(rc.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, opts));
      break;
    }
    case "frame": {
      const fr = el as FrameElement;
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("x", String(fr.x));
      rect.setAttribute("y", String(fr.y));
      rect.setAttribute("width", String(fr.width));
      rect.setAttribute("height", String(fr.height));
      rect.setAttribute("fill", "none");
      rect.setAttribute("stroke", "#868e96");
      g.appendChild(rect);
      const label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", String(fr.x));
      label.setAttribute("y", String(fr.y - 6));
      label.setAttribute("font-size", "12");
      label.setAttribute("font-family", "sans-serif");
      label.setAttribute("fill", "#868e96");
      label.textContent = fr.name || "Frame";
      g.appendChild(label);
      break;
    }
    case "line": {
      const l = el as LineElement;
      const pts = l.points.map((p) => [l.x + p.x, l.y + p.y]) as [number, number][];
      g.appendChild(rc.linearPath(pts, opts));
      break;
    }
    case "arrow": {
      appendArrow(rc, g, el as ArrowElement, opts);
      break;
    }
    case "draw": {
      appendFreehand(g, el as DrawElement);
      break;
    }
    case "text": {
      appendText(g, el as TextElement);
      break;
    }
    case "image": {
      appendImage(g, el as ImageElement);
      break;
    }
    case "embed": {
      appendEmbedPlaceholder(g, el as EmbedElement);
      break;
    }
  }
}

// SVG can't host a live cross-origin iframe either — same placeholder the
// canvas renderer draws for PNG export.
function appendEmbedPlaceholder(g: SVGGElement, el: EmbedElement) {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(el.x));
  rect.setAttribute("y", String(el.y));
  rect.setAttribute("width", String(el.width));
  rect.setAttribute("height", String(el.height));
  rect.setAttribute("fill", "#f1f3f5");
  rect.setAttribute("stroke", "#868e96");
  rect.setAttribute("stroke-dasharray", "6 4");
  g.appendChild(rect);
  const label = document.createElementNS(SVG_NS, "text");
  label.setAttribute("x", String(el.x + el.width / 2));
  label.setAttribute("y", String(el.y + el.height / 2));
  label.setAttribute("font-size", "13");
  label.setAttribute("font-family", "sans-serif");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("fill", "#495057");
  label.textContent = embedHostLabel(el.url);
  g.appendChild(label);
}

function appendArrow(rc: ReturnType<typeof rough.svg>, g: SVGGElement, a: ArrowElement, opts: ReturnType<typeof roughOptions>) {
  const worldPoints = a.elbowed
    ? computeElbowPoints({ x: a.x + a.points[0].x, y: a.y + a.points[0].y }, { x: a.x + a.points[a.points.length - 1].x, y: a.y + a.points[a.points.length - 1].y })
    : a.points.map((p) => ({ x: a.x + p.x, y: a.y + p.y }));
  const pts = worldPoints.map((p) => [p.x, p.y]) as [number, number][];
  if (pts.length < 2) return;
  g.appendChild(rc.linearPath(pts, opts));
  const end = pts[pts.length - 1];
  const beforeEnd = pts[pts.length - 2];
  const start = pts[0];
  const afterStart = pts[1];
  if (a.endArrowhead !== "none") appendArrowhead(rc, g, beforeEnd, end, a.endArrowhead, opts, a.strokeColor);
  if (a.startArrowhead !== "none") appendArrowhead(rc, g, afterStart, start, a.startArrowhead, opts, a.strokeColor);
}

function appendArrowhead(
  rc: ReturnType<typeof rough.svg>,
  g: SVGGElement,
  from: [number, number],
  to: [number, number],
  style: ArrowheadStyle,
  opts: ReturnType<typeof roughOptions>,
  color: string
) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const size = 16;
  if (style === "dot") {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(to[0]));
    circle.setAttribute("cy", String(to[1]));
    circle.setAttribute("r", "5");
    circle.setAttribute("fill", color);
    g.appendChild(circle);
    return;
  }
  if (style === "bar") {
    const perp = angle + Math.PI / 2;
    const p1: [number, number] = [to[0] + Math.cos(perp) * 8, to[1] + Math.sin(perp) * 8];
    const p2: [number, number] = [to[0] - Math.cos(perp) * 8, to[1] - Math.sin(perp) * 8];
    g.appendChild(rc.line(p1[0], p1[1], p2[0], p2[1], opts));
    return;
  }
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  const p1: [number, number] = [to[0] + Math.cos(a1) * size, to[1] + Math.sin(a1) * size];
  const p2: [number, number] = [to[0] + Math.cos(a2) * size, to[1] + Math.sin(a2) * size];
  if (style === "triangle") {
    g.appendChild(rc.polygon([to, p1, p2], { ...opts, fill: color, fillStyle: "solid" }));
  } else {
    g.appendChild(rc.line(to[0], to[1], p1[0], p1[1], opts));
    g.appendChild(rc.line(to[0], to[1], p2[0], p2[1], opts));
  }
}

function appendFreehand(g: SVGGElement, d: DrawElement) {
  const inputPoints = d.points.map((p) => [p.x, p.y] as [number, number]);
  const stroke = getStroke(inputPoints, {
    size: strokeWidthValue(d.strokeWidth) * 4 + 2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
  });
  if (!stroke.length) return;
  const path = document.createElementNS(SVG_NS, "path");
  const d0 = stroke[0];
  const rest = stroke
    .slice(1)
    .map(([x, y]) => `L ${x} ${y}`)
    .join(" ");
  path.setAttribute("d", `M ${d0[0]} ${d0[1]} ${rest} Z`);
  path.setAttribute("fill", d.strokeColor);
  path.setAttribute("transform", `translate(${d.x}, ${d.y})`);
  g.appendChild(path);
}

function appendText(g: SVGGElement, t: TextElement) {
  const lineHeight = t.fontSize * 1.25;
  const lines = t.containerId ? wrapTextToWidth(t.text, t.width, t.fontSize, t.fontFamily) : t.text.split("\n");
  const anchorX = t.textAlign === "left" ? t.x : t.textAlign === "right" ? t.x + t.width : t.x + t.width / 2;
  const anchor = t.textAlign === "left" ? "start" : t.textAlign === "right" ? "end" : "middle";
  lines.forEach((line, i) => {
    if (!line) return;
    const node = document.createElementNS(SVG_NS, "text");
    node.setAttribute("x", String(anchorX));
    node.setAttribute("y", String(t.y + i * lineHeight));
    node.setAttribute("font-size", String(t.fontSize));
    node.setAttribute("font-family", fontStack(t.fontFamily));
    node.setAttribute("text-anchor", anchor);
    node.setAttribute("dominant-baseline", "hanging");
    node.setAttribute("fill", t.strokeColor);
    node.textContent = line;
    g.appendChild(node);
  });
}

// Images have no vector source to recover, so they're embedded as a raster
// <image> — cropped ones are pre-baked onto an offscreen canvas first so the
// exported SVG doesn't need a <clipPath> to reproduce the crop.
function appendImage(g: SVGGElement, img: ImageElement) {
  const cached = getCachedImage(img.fileId);
  let href = img.dataURL;
  if (img.crop && cached && cached.complete) {
    const canvas = document.createElement("canvas");
    canvas.width = img.crop.width;
    canvas.height = img.crop.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(cached, img.crop.x, img.crop.y, img.crop.width, img.crop.height, 0, 0, img.crop.width, img.crop.height);
      href = canvas.toDataURL("image/png");
    }
  }
  const node = document.createElementNS(SVG_NS, "image");
  node.setAttribute("x", String(img.x));
  node.setAttribute("y", String(img.y));
  node.setAttribute("width", String(img.width));
  node.setAttribute("height", String(img.height));
  node.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
  node.setAttribute("href", href);
  g.appendChild(node);
}
