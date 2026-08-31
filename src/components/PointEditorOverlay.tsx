import type { ArrowElement, LineElement } from "../types";

// Pure-visual dots at each point of a line/arrow being point-edited — all hit
// testing (drag a point, click a segment to insert, Alt+click to remove)
// happens in Canvas.tsx's own pointer handlers, the same way the resize
// handles are hit-tested there, not via events on these elements.
export function PointEditorOverlay({
  element,
  scrollX,
  scrollY,
  zoom,
}: {
  element: LineElement | ArrowElement;
  scrollX: number;
  scrollY: number;
  zoom: number;
}) {
  const toScreen = (x: number, y: number) => ({ x: (element.x + x) * zoom + scrollX, y: (element.y + y) * zoom + scrollY });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {element.points.map((p, i) => {
        const s = toScreen(p.x, p.y);
        const isEndpoint = i === 0 || i === element.points.length - 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x - 6,
              top: s.y - 6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isEndpoint ? "#4dabf7" : "#fff",
              border: "2px solid #4dabf7",
            }}
          />
        );
      })}
    </div>
  );
}
