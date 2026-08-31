import { getResizeHandles } from "../canvas/geometry";
import type { ImageElement } from "../types";

// Pure-visual crop chrome: an outline around the image's current display box
// plus its 8 edge/corner handles. Dragging is hit-tested manually in
// Canvas.tsx (applyCrop), matching the resize-handle pattern used elsewhere —
// these elements never receive pointer events themselves.
export function CropOverlay({ image, scrollX, scrollY, zoom }: { image: ImageElement; scrollX: number; scrollY: number; zoom: number }) {
  const bounds = { x1: image.x, y1: image.y, x2: image.x + image.width, y2: image.y + image.height };
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
          border: "1.5px dashed #4dabf7",
          boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)",
        }}
      />
      {Object.entries(handles).map(([key, pt]) => {
        if (key === "rotate") return null;
        const s = toScreen(pt.x, pt.y);
        return (
          <div
            key={key}
            style={{
              position: "absolute",
              left: s.x - 5,
              top: s.y - 5,
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#fff",
              border: "1.5px solid #4dabf7",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: tl.x,
          top: br.y + 8,
          fontSize: 12,
          color: "#fff",
          background: "rgba(0,0,0,0.6)",
          padding: "3px 8px",
          borderRadius: 6,
        }}
      >
        Drag edges to crop, drag inside to reposition — Enter to apply, Esc to cancel
      </div>
    </div>
  );
}
