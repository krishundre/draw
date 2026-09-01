import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { newId, randomSeed } from "../utils/id";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";
import { copyElementsToClipboard, readElementsFromClipboard } from "../utils/clipboard";
import type { EmbedElement, ImageElement } from "../types";
import { isEmbeddableUrl } from "../utils/embedAllowlist";

export function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  // The menu grew a lot of extra rows (align/distribute/link/copy/paste) on
  // top of what it used to have, so it's now much more likely to run off the
  // bottom/right of the viewport than before — clamp it back on-screen after
  // it mounts and we know its real size.
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);
  const {
    appState,
    elements,
    addElements,
    setSelectedIds,
    deleteElements,
    commitHistory,
    bringToFront,
    sendToBack,
    undo,
    redo,
    alignElements,
    distributeElements,
    updateElement,
    setAppState,
  } = useStore();
  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));
  const { ref: glassRef, background } = useAdaptiveContrast<HTMLDivElement>();

  async function copySelection() {
    await copyElementsToClipboard(selected);
    onClose();
  }

  async function pasteSelection() {
    const copied = await readElementsFromClipboard();
    onClose();
    if (!copied || !copied.length) return;
    const clones = copied.map((el, i) => ({ ...el, id: newId(), seed: randomSeed(), x: el.x + 20, y: el.y + 20, zIndex: elements.length + i }));
    addElements(clones as typeof elements);
    setSelectedIds(clones.map((c) => c.id));
    commitHistory();
  }

  function editLink() {
    const current = selected[0]?.link ?? "";
    const url = prompt("Link URL (leave blank to remove):", current ?? "");
    onClose();
    if (url === null) return;
    const trimmed = url.trim();
    updateElement(selected[0].id, { link: trimmed || null });
    commitHistory();
  }

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
    <div
      className="context-menu"
      style={{ left: pos.left, top: pos.top, maxHeight: "calc(100vh - 16px)", overflowY: "auto" }}
      onClick={(e) => e.stopPropagation()}
      ref={(node) => {
        menuRef.current = node;
        glassRef.current = node;
      }}
      data-bg={background ?? undefined}
    >
      <button disabled={!hasSelection} onClick={duplicate}>
        Duplicate (Ctrl+D)
      </button>
      <button disabled={!hasSelection} onClick={copySelection}>
        Copy (Ctrl+C)
      </button>
      <button onClick={pasteSelection}>Paste (Ctrl+V)</button>
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
      <button disabled={selected.length !== 1} onClick={editLink}>
        {selected.length === 1 && selected[0].link ? "Edit link…" : "Add link…"}
      </button>
      {selected.length === 1 && selected[0].type === "image" && (
        <button
          onClick={() => {
            setAppState({ croppingId: selected[0].id, tool: "selection" });
            onClose();
          }}
        >
          Crop image
        </button>
      )}
      {selected.length === 1 && selected[0].type === "image" && (selected[0] as ImageElement).crop && (
        <button
          onClick={() => {
            updateElement(selected[0].id, { crop: null } as Partial<ImageElement>);
            commitHistory();
            onClose();
          }}
        >
          Reset crop
        </button>
      )}
      {selected.length === 1 && selected[0].type === "embed" && (
        <button
          onClick={() => {
            const current = (selected[0] as EmbedElement).url;
            const url = prompt("Embed URL:", current);
            onClose();
            if (!url || url === current) return;
            if (!isEmbeddableUrl(url)) {
              alert("That URL isn't on the allowed list of embeddable sites.");
              return;
            }
            updateElement(selected[0].id, { url } as Partial<EmbedElement>);
            commitHistory();
          }}
        >
          Edit embed URL
        </button>
      )}
      {selected.length === 1 && selected[0].type === "embed" && (
        <button
          onClick={() => {
            setAppState({ interactingEmbedId: selected[0].id });
            onClose();
          }}
        >
          Interact with embed
        </button>
      )}
      <div className="dropdown-sep" />
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "left");
          onClose();
        }}
      >
        Align left
      </button>
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "centerH");
          onClose();
        }}
      >
        Align center (H)
      </button>
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "right");
          onClose();
        }}
      >
        Align right
      </button>
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "top");
          onClose();
        }}
      >
        Align top
      </button>
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "centerV");
          onClose();
        }}
      >
        Align middle (V)
      </button>
      <button
        disabled={selected.length < 2}
        onClick={() => {
          alignElements(appState.selectedIds, "bottom");
          onClose();
        }}
      >
        Align bottom
      </button>
      <button
        disabled={selected.length < 3}
        onClick={() => {
          distributeElements(appState.selectedIds, "horizontal");
          onClose();
        }}
      >
        Distribute horizontally
      </button>
      <button
        disabled={selected.length < 3}
        onClick={() => {
          distributeElements(appState.selectedIds, "vertical");
          onClose();
        }}
      >
        Distribute vertically
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
