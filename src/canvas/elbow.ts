import type { Point } from "../types";

// A minimal orthogonal (horizontal/vertical-only) router between two points —
// flowchart-connector style. This is deliberately simple: a single mid-line
// bend, not full obstacle-avoidance pathfinding (that's a much larger project
// the gap analysis explicitly scoped out). It picks the axis with the larger
// gap to bend along first, which reads naturally for the common case of two
// boxes connected top-to-bottom or side-to-side.
//
// Bounding box of the result always equals the bounding box of start/end
// (the bend sits strictly between them on one axis), so callers that derive
// element bounds from start/end don't need special-casing for elbow arrows —
// only hit-testing (which needs the actual bent path) does.
export function computeElbowPoints(start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 || dy === 0) {
    return [start, end]; // already a straight orthogonal segment
  }

  if (Math.abs(dx) >= Math.abs(dy)) {
    const midX = start.x + dx / 2;
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }
  const midY = start.y + dy / 2;
  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}
