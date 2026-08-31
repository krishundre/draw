import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { BUILTIN_LIBRARY } from "../library/builtins";
import { newId, randomSeed } from "../utils/id";
import type { LibraryItem, WhiteboardElement } from "../types";
import { downloadFile } from "../utils/export";
import { getCombinedBounds } from "../canvas/geometry";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";

const STORAGE_KEY = "drawboard-library";

function loadCustom(): LibraryItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveCustom(items: LibraryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type Tab = "builtin" | "custom" | "imported";

export function LibraryPanel({ onClose }: { onClose: () => void }) {
  const { elements, appState, addElements, setSelectedIds, commitHistory } = useStore();
  const [custom, setCustom] = useState<LibraryItem[]>(loadCustom());
  const [tab, setTab] = useState<Tab>("builtin");
  const fileRef = useRef<HTMLInputElement>(null);
  const { ref: glassRef, background } = useAdaptiveContrast<HTMLDivElement>();

  useEffect(() => saveCustom(custom), [custom]);

  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));
  const myItems = custom.filter((i) => i.source !== "imported");
  const importedItems = custom.filter((i) => i.source === "imported");

  function insert(item: LibraryItem) {
    const idMap = new Map<string, string>();
    const clones = item.elements.map((el) => {
      const id = newId();
      idMap.set(el.id, id);
      return { ...el, id, seed: randomSeed(), zIndex: elements.length };
    });
    const bounds = getCombinedBounds(clones);
    const offsetX = 200 - (bounds.x1 + bounds.x2) / 2;
    const offsetY = 200 - (bounds.y1 + bounds.y2) / 2;
    const placed = clones.map((el) => ({ ...el, x: el.x + offsetX, y: el.y + offsetY })) as WhiteboardElement[];
    addElements(placed);
    setSelectedIds(placed.map((e) => e.id));
    commitHistory();
  }

  function addSelectionToLibrary() {
    if (!selected.length) return;
    const name = prompt("Name for this library item:", "My shape") || "My shape";
    setCustom((c) => [...c, { id: newId(), name, source: "custom", elements: JSON.parse(JSON.stringify(selected)) }]);
    setTab("custom");
  }

  function removeCustom(id: string) {
    setCustom((c) => c.filter((i) => i.id !== id));
  }

  function exportLibrary() {
    downloadFile(JSON.stringify({ type: "excalidrawlib", version: 1, library: custom }, null, 2), "library.excalidrawlib");
  }

  function importLibrary(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = JSON.parse(text);
        const items: LibraryItem[] = (data.library ?? data).map((i: LibraryItem) => ({ ...i, id: i.id || newId(), source: "imported" as const }));
        setCustom((c) => [...c, ...items]);
        setTab("imported");
      } catch {
        alert("Invalid .excalidrawlib file");
      }
    });
    e.target.value = "";
  }

  function renderGrid(items: LibraryItem[], removable: boolean) {
    if (!items.length) return <div className="library-empty">Nothing here yet.</div>;
    return (
      <div className="library-grid">
        {items.map((item) => (
          <div key={item.id} className="library-item-wrap">
            <button className="library-item" onClick={() => insert(item)} title={item.name}>
              {item.name || "Untitled"}
            </button>
            {removable && (
              <button className="library-item-remove" onClick={() => removeCustom(item.id)} title="Remove">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="library-panel" ref={glassRef} data-bg={background ?? undefined}>
      <div className="library-header">
        <span>Library</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="library-toolbar">
        <button onClick={addSelectionToLibrary} disabled={!selected.length}>
          + Add selection
        </button>
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <button onClick={exportLibrary} disabled={!custom.length}>
          Export
        </button>
        <input ref={fileRef} type="file" accept=".excalidrawlib,.json" style={{ display: "none" }} onChange={importLibrary} />
      </div>
      <div className="library-tabs">
        <button className={tab === "builtin" ? "active" : ""} onClick={() => setTab("builtin")}>
          Built-in
        </button>
        <button className={tab === "custom" ? "active" : ""} onClick={() => setTab("custom")}>
          My library {myItems.length > 0 && `(${myItems.length})`}
        </button>
        <button className={tab === "imported" ? "active" : ""} onClick={() => setTab("imported")}>
          Imported {importedItems.length > 0 && `(${importedItems.length})`}
        </button>
      </div>
      <div className="library-tab-content">
        {tab === "builtin" && (
          <div className="library-grid">
            {BUILTIN_LIBRARY.map((item) => (
              <button key={item.id} className="library-item" onClick={() => insert(item)} title={item.name}>
                {item.name}
              </button>
            ))}
          </div>
        )}
        {tab === "custom" && renderGrid(myItems, true)}
        {tab === "imported" && renderGrid(importedItems, true)}
      </div>
    </div>
  );
}
