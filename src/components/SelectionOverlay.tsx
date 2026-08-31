import { getResizeHandles } from "../canvas/geometry";

export function SelectionOverlay({
  bounds,
  scrollX,
  scrollY,
  zoom,
}: {
  bounds: { x1: number; y1: number; x2: number; y2: number };
  scrollX: number;
  scrollY: number;
  zoom: number;
}) {
  const handles = getResizeHandles(bounds);
  const toScreen = (x: number, y: number) => ({ x: x * zoom + scrollX, y: y * zoom + scrollY });
  const tl = toScreen(bounds.x1, bounds.y1);
  const br = toScreen(bounds.x2, bounds.y2);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: tl.x,
          top: tl.y,
          width: br.x - tl.x,
          height: br.y - tl.y,
          border: "1.5px solid #4dabf7",
        }}
      />
      {Object.entries(handles).map(([key, pt]) => {
        const s = toScreen(pt.x, pt.y);
        const isRotate = key === "rotate";
        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: s.x - (isRotate ? 7 : 5),
              top: s.y - (isRotate ? 7 : 5),
              width: isRotate ? 14 : 10,
              height: isRotate ? 14 : 10,
              borderRadius: isRotate ? "50%" : 2,
              background: "#fff",
              border: "1.5px solid #4dabf7",
              // The actual drag is hit-tested manually in Canvas.tsx's own
              // pointerdown handler (proximity to each handle's screen
              // position) — these divs are purely visual. Leaving this at
              // "auto" made them swallow clicks that land dead-center on a
              // handle, since as siblings of <canvas> (not descendants) a
              // pointerdown here never reaches the canvas's own listener.
              pointerEvents: "none",
              cursor: isRotate ? "grab" : `${key}-resize`,
            }}
          />
        );
      })}
    </div>
  );
}
