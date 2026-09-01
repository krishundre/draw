import type { EmbedElement } from "../types";

// Renders each embed element as a real DOM <iframe> positioned over the
// canvas at its element bounds — canvas itself can only draw a placeholder
// (see drawEmbedPlaceholder in render.ts), since a bitmap can't host a live
// cross-origin frame.
//
// The iframe is pointer-events:none unless it's the one element currently
// being "interacted with" (entered via double-click, see Canvas.tsx) — while
// inert it behaves like an opaque box for normal canvas selection/move/resize
// hit-testing, exactly like every other element; without this, the iframe
// would sit on top of the canvas and swallow every click meant for it.
export function EmbedOverlay({
  elements,
  interactingId,
  scrollX,
  scrollY,
  zoom,
}: {
  elements: EmbedElement[];
  interactingId: string | null;
  scrollX: number;
  scrollY: number;
  zoom: number;
}) {
  return (
    <>
      {elements.map((el) => {
        const interactive = el.id === interactingId;
        return (
          <iframe
            key={el.id}
            src={el.url}
            title={el.url}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
            referrerPolicy="no-referrer"
            style={{
              position: "absolute",
              left: el.x * zoom + scrollX,
              top: el.y * zoom + scrollY,
              width: el.width * zoom,
              height: el.height * zoom,
              border: "1px solid rgba(0,0,0,0.15)",
              opacity: el.opacity / 100,
              pointerEvents: interactive ? "auto" : "none",
              outline: interactive ? "2px solid #4dabf7" : "none",
            }}
          />
        );
      })}
    </>
  );
}
