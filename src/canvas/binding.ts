import type { WhiteboardElement, Point } from "../types";

// Only these shape types can anchor an arrow endpoint — text/frame/image/line
// binding isn't part of this pass (matches Excalidraw's own core binding set).
const BINDABLE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);

const BIND_PAD = 12; // world-space px of slack around a shape's edge that still counts as "inside" for binding purposes

export function isBindableType(type: string): boolean {
  return BINDABLE_TYPES.has(type);
}

export function findBindableShapeAt(elements: WhiteboardElement[], x: number, y: number, excludeId?: string): WhiteboardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.id === excludeId || el.locked || el.isDeleted || !isBindableType(el.type)) continue;
    if (pointNearShape(x, y, el)) return el;
  }
  return null;
}

function pointNearShape(px: number, py: number, el: WhiteboardElement): boolean {
  const x1 = el.x - BIND_PAD;
  const y1 = el.y - BIND_PAD;
  const x2 = el.x + el.width + BIND_PAD;
  const y2 = el.y + el.height + BIND_PAD;
  if (el.type === "ellipse") {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const rx = el.width / 2 + BIND_PAD;
    const ry = el.height / 2 + BIND_PAD;
    if (rx <= 0 || ry <= 0) return false;
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return px >= x1 && px <= x2 && py >= y1 && py <= y2;
}

// Point on `el`'s boundary along the ray from its center toward (targetX, targetY),
// pushed outward by `gap` — the point an arrow endpoint should sit at so it looks
// anchored to the shape without overlapping its outline. Handles rectangle,
// diamond, and ellipse with one shared ray-intersection formula per shape type;
// rotation is ignored (acceptable for this pass — resize/rotate handles already
// treat combined bounds axis-aligned in the same way elsewhere in this codebase).
export function getEdgePointTowards(el: WhiteboardElement, targetX: number, targetY: number, gap: number): Point {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  const hw = el.width / 2 || 0.01;
  const hh = el.height / 2 || 0.01;

  if (dx === 0 && dy === 0) {
    return { x: cx + hw + gap, y: cy };
  }

  let t: number;
  if (el.type === "ellipse") {
    t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
  } else if (el.type === "diamond") {
    t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
  } else {
    t = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  }

  const edgeX = cx + dx * t;
  const edgeY = cy + dy * t;
  const dist = Math.hypot(dx, dy) || 1;
  return {
    x: edgeX + (dx / dist) * gap,
    y: edgeY + (dy / dist) * gap,
  };
}
