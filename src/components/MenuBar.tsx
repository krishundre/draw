import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { Icon } from "./Icon";
import { downloadFile, exportToJSON, exportToPNG, exportToSVG, copyPNGToClipboard, parseImportedFile } from "../utils/export";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";

export function MenuBar() {
  const [open, setOpen] = useState(false);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const { elements, appState, setAllElements, setAppState } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrap = useAdaptiveContrast<HTMLDivElement>();
  const menu = useAdaptiveContrast<HTMLDivElement>(open);
  // The style panel lives in this same corner (below the toolbar row, flush
  // left) whenever a tool is active or something's selected — which overlaps
  // this dropdown's default position exactly, and two translucent glass
  // panels stacked on each other just blend into illegible overlapping text.
  // Shift the dropdown below the style panel's actual rendered bottom edge
  // (if present) rather than a fixed guess, since its height varies with
  // content (arrowheads/font sections, how many elements are selected, etc).
  const menuBoxRef = useRef<HTMLDivElement>(null);
  const [dropdownTop, setDropdownTop] = useState<number | null>(null);
  useEffect(() => {
    if (!open) {
      setDropdownTop(null);
      return;
    }
    const stylePanel = document.querySelector(".style-panel");
    if (!stylePanel) return;
    const rect = stylePanel.getBoundingClientRect();
    const wrapRect = menuBoxRef.current?.parentElement?.getBoundingClientRect();
    if (!wrapRect || rect.bottom <= wrapRect.top) return; // no overlap — default position is fine
    setDropdownTop(rect.bottom - wrapRect.top + 8);
  }, [open]);

  const hasSelection = appState.selectedIds.length > 0;
  const exportElements = useMemo(
    () => (selectionOnly && hasSelection ? elements.filter((el) => appState.selectedIds.includes(el.id)) : elements),
    [selectionOnly, hasSelection, elements, appState.selectedIds]
  );

  function openImport() {
    fileInputRef.current?.click();
    setOpen(false);
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const data = parseImportedFile(text);
        setAllElements(data.elements);
        if (data.appState?.canvasBackground) setAppState({ canvasBackground: data.appState.canvasBackground });
      } catch (err) {
        alert("Could not import file: " + (err as Error).message);
      }
    });
    e.target.value = "";
  }

  async function handleExportPNG(transparent: boolean, scale: number) {
    const blob = await exportToPNG(exportElements, { background: appState.canvasBackground, scale, transparent });
    downloadFile(blob, "drawing.png");
    setOpen(false);
  }

  function handleExportSVG() {
    const svg = exportToSVG(exportElements, { background: appState.canvasBackground, transparent: false });
    downloadFile(new Blob([svg], { type: "image/svg+xml" }), "drawing.svg");
    setOpen(false);
  }

  function handleExportJSON() {
    downloadFile(exportToJSON(elements, appState.canvasBackground), "drawing.excalidraw");
    setOpen(false);
  }

  async function handleCopyPNG() {
    await copyPNGToClipboard(exportElements, { background: appState.canvasBackground, scale: 2, transparent: true });
    setOpen(false);
  }

  function handleClear() {
    if (confirm("Clear the entire canvas? This cannot be undone from other devices already synced.")) {
      setAllElements([]);
      setOpen(false);
    }
  }

  return (
    <div className="menu-wrap" ref={wrap.ref} data-bg={wrap.background ?? undefined} data-tutorial="menu">
      <button className="tool-btn" title="Menu" onClick={() => setOpen((v) => !v)}>
        <Icon name="menu" />
      </button>
      {open && (
        <div
          className="dropdown"
          style={dropdownTop !== null ? { top: dropdownTop, maxHeight: `calc(100vh - ${dropdownTop + 16}px)`, overflowY: "auto" } : undefined}
          ref={(node) => {
            menuBoxRef.current = node;
            menu.ref.current = node;
          }}
          data-bg={menu.background ?? undefined}
        >
          <button onClick={openImport}>Open .excalidraw file…</button>
          <button onClick={handleExportJSON}>Save as .excalidraw (JSON)</button>
          <div className="dropdown-sep" />
          <label className="dropdown-row">
            Export selection only
            <input
              type="checkbox"
              checked={selectionOnly}
              disabled={!hasSelection}
              onChange={(e) => setSelectionOnly(e.target.checked)}
            />
          </label>
          <button onClick={() => handleExportPNG(false, 1)}>Export as PNG (1x)</button>
          <button onClick={() => handleExportPNG(true, 2)}>Export as PNG (2x, transparent)</button>
          <button onClick={handleExportSVG}>Export as SVG</button>
          <button onClick={handleCopyPNG}>Copy to clipboard as PNG</button>
          <div className="dropdown-sep" />
          <label className="dropdown-row">
            Canvas background
            <input type="color" value={appState.canvasBackground} onChange={(e) => setAppState({ canvasBackground: e.target.value })} />
          </label>
          <label className="dropdown-row">
            Grid
            <input type="checkbox" checked={appState.gridEnabled} onChange={(e) => setAppState({ gridEnabled: e.target.checked })} />
          </label>
          <div className="dropdown-sep" />
          <button onClick={handleClear} className="danger">
            Clear canvas
          </button>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".excalidraw,.json" style={{ display: "none" }} onChange={onImportFile} />
    </div>
  );
}
