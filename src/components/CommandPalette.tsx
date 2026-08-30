import { useEffect, useMemo, useState } from "react";
import { useStore } from "../state/store";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [query, setQuery] = useState("");

  const commands: Command[] = useMemo(
    () => [
      { id: "undo", label: "Undo", shortcut: "Ctrl+Z", run: store.undo },
      { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z", run: store.redo },
      { id: "select-all", label: "Select all", shortcut: "Ctrl+A", run: () => store.setSelectedIds(store.elements.map((e) => e.id)) },
      { id: "delete", label: "Delete selected", shortcut: "Del", run: () => store.deleteElements(store.appState.selectedIds) },
      { id: "toggle-theme", label: "Toggle dark/light theme", run: () => store.setAppState({ theme: store.appState.theme === "light" ? "dark" : "light" }) },
      { id: "toggle-grid", label: "Toggle grid", run: () => store.setAppState({ gridEnabled: !store.appState.gridEnabled }) },
      { id: "zoom-reset", label: "Reset zoom to 100%", run: () => store.setAppState({ zoom: 1, scrollX: 0, scrollY: 0 }) },
      { id: "zoom-in", label: "Zoom in", shortcut: "Ctrl+=", run: () => store.setAppState({ zoom: Math.min(30, store.appState.zoom + 0.1) }) },
      { id: "zoom-out", label: "Zoom out", shortcut: "Ctrl+-", run: () => store.setAppState({ zoom: Math.max(0.1, store.appState.zoom - 0.1) }) },
      { id: "tool-selection", label: "Tool: Selection", shortcut: "V", run: () => store.setTool("selection") },
      { id: "tool-rectangle", label: "Tool: Rectangle", shortcut: "R", run: () => store.setTool("rectangle") },
      { id: "tool-ellipse", label: "Tool: Ellipse", shortcut: "O", run: () => store.setTool("ellipse") },
      { id: "tool-arrow", label: "Tool: Arrow", shortcut: "A", run: () => store.setTool("arrow") },
      { id: "tool-text", label: "Tool: Text", shortcut: "T", run: () => store.setTool("text") },
      { id: "tool-hand", label: "Tool: Hand (pan)", shortcut: "H", run: () => store.setTool("hand") },
      { id: "group", label: "Group selection", shortcut: "Ctrl+G", run: () => store.group(store.appState.selectedIds) },
      { id: "ungroup", label: "Ungroup selection", shortcut: "Ctrl+Shift+G", run: () => store.ungroup(store.appState.selectedIds) },
      { id: "front", label: "Bring to front", run: () => store.bringToFront(store.appState.selectedIds) },
      { id: "back", label: "Send to back", run: () => store.sendToBack(store.appState.selectedIds) },
    ],
    [store]
  );

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input autoFocus placeholder="Type a command…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="command-list">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                c.run();
                onClose();
              }}
            >
              <span>{c.label}</span>
              {c.shortcut && <kbd>{c.shortcut}</kbd>}
            </button>
          ))}
          {filtered.length === 0 && <div className="command-empty">No matching commands</div>}
        </div>
      </div>
    </div>
  );
}
