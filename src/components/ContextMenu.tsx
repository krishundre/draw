import { useEffect } from "react";
import { useStore } from "../state/store";
import { newId, randomSeed } from "../utils/id";

export function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const { appState, elements, addElements, setSelectedIds, deleteElements, commitHistory, bringToFront, sendToBack, undo, redo } = useStore();
  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [onClose]);

  function duplicate() {
    const clones = selected.map((el) => ({ ...el, id: newId(), seed: randomSeed(), x: el.x + 20, y: el.y + 20, zIndex: elements.length }));
    addElements(clones as typeof elements);
    setSelectedIds(clones.map((c) => c.id));
    commitHistory();
    onClose();
  }

  function copyStyle() {
    if (!selected.length) return;
    localStorage.setItem("drawboard-copied-style", JSON.stringify(selected[0]));
    onClose();
  }

  function pasteStyle() {
    const raw = localStorage.getItem("drawboard-copied-style");
    if (!raw || !selected.length) return;
    const style = JSON.parse(raw);
    const { updateElements } = useStore.getState();
    updateElements(
      selected.map((s) => s.id),
      {
        strokeColor: style.strokeColor,
        backgroundColor: style.backgroundColor,
        fillStyle: style.fillStyle,
        strokeWidth: style.strokeWidth,
        strokeStyle: style.strokeStyle,
        roughness: style.roughness,
        edges: style.edges,
        opacity: style.opacity,
      }
    );
    commitHistory();
    onClose();
  }

  const hasSelection = selected.length > 0;

  return (
    <div className="context-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <button disabled={!hasSelection} onClick={duplicate}>
        Duplicate (Ctrl+D)
      </button>
      <button disabled={!hasSelection} onClick={copyStyle}>
        Copy styles
      </button>
      <button disabled={!hasSelection} onClick={pasteStyle}>
        Paste styles
      </button>
      <button
        disabled={!hasSelection}
        onClick={() => {
          bringToFront(appState.selectedIds);
          onClose();
        }}
      >
        Bring to front
      </button>
      <button
        disabled={!hasSelection}
        onClick={() => {
          sendToBack(appState.selectedIds);
          onClose();
        }}
      >
        Send to back
      </button>
      <div className="dropdown-sep" />
      <button
        onClick={() => {
          undo();
          onClose();
        }}
      >
        Undo
      </button>
      <button
        onClick={() => {
          redo();
          onClose();
        }}
      >
        Redo
      </button>
      <div className="dropdown-sep" />
      <button
        disabled={!hasSelection}
        className="danger"
        onClick={() => {
          deleteElements(appState.selectedIds);
          onClose();
        }}
      >
        Delete
      </button>
    </div>
  );
}
