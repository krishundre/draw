import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";
import { getElementBounds } from "../canvas/geometry";
import { getRegisteredCanvas } from "../canvas/canvasRegistry";
import type { TextElement, WhiteboardElement } from "../types";

function label(el: WhiteboardElement): string {
  if (el.type === "text") return (el as TextElement).text.trim() || "(empty text)";
  return el.type;
}

// Reuses the command palette's own modal/list markup (.modal-backdrop,
// .command-palette, .command-list) so it looks and behaves the same way —
// just searching elements instead of commands.
export function SceneSearch({ onClose }: { onClose: () => void }) {
  const { elements, appState, setAppState, setSelectedIds, setTool } = useStore();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return elements.filter((el) => !el.isDeleted && (label(el).toLowerCase().includes(q) || el.type.includes(q))).slice(0, 30);
  }, [elements, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function goTo(el: WhiteboardElement) {
    const bounds = getElementBounds(el);
    const cx = (bounds.x1 + bounds.x2) / 2;
    const cy = (bounds.y1 + bounds.y2) / 2;
    const canvas = getRegisteredCanvas();
    const w = canvas?.clientWidth ?? window.innerWidth;
    const h = canvas?.clientHeight ?? window.innerHeight;
    setAppState({ scrollX: w / 2 - cx * appState.zoom, scrollY: h / 2 - cy * appState.zoom });
    setSelectedIds([el.id]);
    setTool("selection");
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Search elements by text or type…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="command-list">
          {results.map((el) => (
            <button key={el.id} onClick={() => goTo(el)}>
              <span>{label(el)}</span>
              <kbd>{el.type}</kbd>
            </button>
          ))}
          {query.trim() && results.length === 0 && <div className="command-empty">No matching elements</div>}
        </div>
      </div>
    </div>
  );
}
