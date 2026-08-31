import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { measureText } from "../canvas/render";
import { layoutBoundText, TEXT_CONTAINER_PADDING } from "../canvas/text";
import type { TextElement } from "../types";

export function TextEditorOverlay({ elementId }: { elementId: string }) {
  const { elements, appState, updateElement, deleteElements, setAppState, commitHistory } = useStore();
  const el = elements.find((e) => e.id === elementId) as TextElement | undefined;
  const container = el?.containerId ? elements.find((e) => e.id === el.containerId) : undefined;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!el) return null;

  function finish() {
    if (!el) return;
    if (!el.text.trim()) {
      deleteElements([el.id]);
    } else {
      commitHistory();
    }
    setAppState({ editingTextId: null });
  }

  const fontStack = el.fontFamily === "hand-drawn" ? '"Segoe Print","Comic Sans MS",cursive' : el.fontFamily === "code" ? '"Cascadia Code",monospace' : "Helvetica,Arial,sans-serif";

  return (
    <textarea
      ref={ref}
      value={el.text}
      onChange={(e) => {
        const value = e.target.value;
        if (container) {
          // Bound text wraps to the container's inner width rather than
          // growing with content; if the wrapped text now needs more height
          // than the container has, grow the container and re-center.
          let layout = layoutBoundText(container, value, el.fontSize, el.fontFamily);
          const neededHeight = layout.height + TEXT_CONTAINER_PADDING * 2;
          if (neededHeight > container.height) {
            updateElement(container.id, { height: neededHeight });
            layout = layoutBoundText({ ...container, height: neededHeight }, value, el.fontSize, el.fontFamily);
          }
          updateElement(el.id, { text: value, ...layout });
        } else {
          const { width, height } = measureText(value || " ", el.fontSize, el.fontFamily);
          updateElement(el.id, { text: value, width: width + 4, height: Math.max(height, el.fontSize * 1.25) });
        }
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finish();
        }
      }}
      style={{
        position: "absolute",
        left: el.x * appState.zoom + appState.scrollX,
        top: el.y * appState.zoom + appState.scrollY,
        width: Math.max(el.width, 40) * appState.zoom + 20,
        height: Math.max(el.height, el.fontSize * 1.25) * appState.zoom + 10,
        fontSize: el.fontSize * appState.zoom,
        fontFamily: fontStack,
        color: el.strokeColor,
        textAlign: el.textAlign,
        lineHeight: 1.25,
        background: "transparent",
        border: "1px dashed #4dabf7",
        outline: "none",
        resize: "none",
        overflow: "hidden",
        padding: 0,
        margin: 0,
      }}
    />
  );
}
