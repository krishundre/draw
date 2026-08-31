import type { WhiteboardElement, Point, ArrowElement, LineElement, DrawElement } from "../types";

export function getElementBounds(el: WhiteboardElement): { x1: number; y1: number; x2: number; y2: number } {
  if ("points" in el && (el as ArrowElement | LineElement | DrawElement).points.length) {
    const pts = (el as ArrowElement | LineElement | DrawElement).points;
    const xs = pts.map((p) => p.x + el.x);
    const ys = pts.map((p) => p.y + el.y);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  return { x1: el.x, y1: el.y, x2: el.x + el.width, y2: el.y + el.height };
}

export function getCombinedBounds(elements: WhiteboardElement[]) {
  const boxes = elements.map(getElementBounds);
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  };
}

export function isPointInElement(px: number, py: number, el: WhiteboardElement): boolean {
  const { x1, y1, x2, y2 } = getElementBounds(el);
  const pad = 5;
  if (el.type === "draw" || el.type === "line" || el.type === "arrow") {
    return distanceToPolyline(px, py, el as DrawElement | LineElement | ArrowElement) < 8;
  }
  if (el.type === "ellipse") {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = (x2 - x1) / 2 + pad;
    const ry = (y2 - y1) / 2 + pad;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return px >= x1 - pad && px <= x2 + pad && py >= y1 - pad && py <= y2 + pad;
}

function distanceToPolyline(px: number, py: number, el: DrawElement | LineElement | ArrowElement): number {
  let min = Infinity;
  const pts = el.points.map((p) => ({ x: p.x + el.x, y: p.y + el.y }));
  for (let i = 0; i < pts.length - 1; i++) {
    min = Math.min(min, distToSegment(px, py, pts[i], pts[i + 1]));
  }
  if (pts.length === 1) min = Math.hypot(px - pts[0].x, py - pts[0].y);
  return min;
}

function distToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function isElementInRect(el: WhiteboardElement, rx1: number, ry1: number, rx2: number, ry2: number): boolean {
  const { x1, y1, x2, y2 } = getElementBounds(el);
  const [minX, maxX] = rx1 < rx2 ? [rx1, rx2] : [rx2, rx1];
  const [minY, maxY] = ry1 < ry2 ? [ry1, ry2] : [ry2, ry1];
  return x1 >= minX && x2 <= maxX && y1 >= minY && y2 <= maxY;
}

export type HandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export function getResizeHandles(bounds: { x1: number; y1: number; x2: number; y2: number }): Record<HandlePosition, Point> {
  const { x1, y1, x2, y2 } = bounds;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return {
    nw: { x: x1, y: y1 },
    n: { x: midX, y: y1 },
    ne: { x: x2, y: y1 },
    e: { x: x2, y: midY },
    se: { x: x2, y: y2 },
    s: { x: midX, y: y2 },
    sw: { x: x1, y: y2 },
    w: { x: x1, y: midY },
    rotate: { x: midX, y: y1 - 30 },
  };
}

export function snapToGrid(v: number, gridSize = 20): number {
  return Math.round(v / gridSize) * gridSize;
}

// Standard ray-casting point-in-polygon test.
export function isPointInPolygon(px: number, py: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// An element counts as lasso-selected when all four corners of its bounding
// box fall inside the lasso polygon — same "fully contained" rule the
// rectangular marquee (isElementInRect) already uses, just against a
// freeform outline instead of an axis-aligned box.
export function isElementInPolygon(el: WhiteboardElement, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  const { x1, y1, x2, y2 } = getElementBounds(el);
  return (
    isPointInPolygon(x1, y1, polygon) &&
    isPointInPolygon(x2, y1, polygon) &&
    isPointInPolygon(x2, y2, polygon) &&
    isPointInPolygon(x1, y2, polygon)
  );
}
