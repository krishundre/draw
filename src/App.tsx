import { useEffect, useState } from "react";
import { Canvas } from "./canvas/Canvas";
import { Toolbar } from "./components/Toolbar";
import { StylePanel } from "./components/StylePanel";
import { BottomBar } from "./components/BottomBar";
import { TopRightBar } from "./components/TopRightBar";
import { MenuBar } from "./components/MenuBar";
import { LibraryPanel } from "./components/LibraryPanel";
import { ContextMenu } from "./components/ContextMenu";
import { CommandPalette } from "./components/CommandPalette";
import { HelpDialog } from "./components/HelpDialog";
import { useStore } from "./state/store";
import { KEY_TO_TOOL } from "./tools/toolDefs";
import { newId, randomSeed } from "./utils/id";

export default function App() {
  const store = useStore();
  const { appState } = store;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appState.theme);
  }, [appState.theme]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "TEXTAREA" || target.tagName === "INPUT";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setHelpOpen(false);
        setLibraryOpen(false);
        setContextMenu(null);
        store.setSelectedIds([]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        store.setSelectedIds(store.elements.map((el) => el.id));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const selected = store.elements.filter((el) => appState.selectedIds.includes(el.id));
        if (!selected.length) return;
        const clones = selected.map((el) => ({ ...el, id: newId(), seed: randomSeed(), x: el.x + 20, y: el.y + 20, zIndex: store.elements.length }));
        store.addElements(clones as typeof store.elements);
        store.setSelectedIds(clones.map((c) => c.id));
        store.commitHistory();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) store.ungroup(appState.selectedIds);
        else store.group(appState.selectedIds);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (appState.selectedIds.length) {
          e.preventDefault();
          store.deleteElements(appState.selectedIds);
        }
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && appState.selectedIds.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        appState.selectedIds.forEach((id) => {
          const el = store.elements.find((x) => x.id === id);
          if (el) store.updateElement(id, { x: el.x + dx, y: el.y + dy });
        });
        return;
      }

      const tool = KEY_TO_TOOL[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        store.setTool(tool);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store, appState.selectedIds, appState.theme]);

  return (
    <div
      className="app-root"
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <Canvas />
      <div className="top-left-bar">
        <MenuBar />
        <Toolbar />
      </div>
      <StylePanel />
      <BottomBar />
      <TopRightBar onOpenLibrary={() => setLibraryOpen((v) => !v)} onOpenHelp={() => setHelpOpen(true)} />
      {libraryOpen && <LibraryPanel onClose={() => setLibraryOpen(false)} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />}
    </div>
  );
}
