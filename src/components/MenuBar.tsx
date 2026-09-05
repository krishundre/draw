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
  // content (arrowheads/font sections, how many elements are selected, etc) —
  // and keep re-measuring for as long as the menu stays open, not just once
  // at the moment it opens: the style panel can appear, disappear, or change
  // height *while* the menu is already open (switching tools, changing the
  // selection, a longer/shorter set of style sections), and a one-shot
  // measurement goes stale the moment any of that happens.
  const menuBoxRef = useRef<HTMLDivElement>(null);
  const [dropdownTop, setDropdownTop] = useState<number | null>(null);
  useEffect(() => {
    if (!open) {
      setDropdownTop(null);
      return;
    }
    const resizeObserver = new ResizeObserver(recompute);
    const observedRef: { current: Element | null } = { current: null };
    function recompute() {
      const wrapRect = menuBoxRef.current?.parentElement?.getBoundingClientRect();
      const stylePanel = document.querySelector(".style-panel");
      // Keep the ResizeObserver pointed at whichever style panel element
      // currently exists — it can be unmounted/remounted (a fresh DOM node)
      // whenever the tool/selection state toggles it on and off, and only
      // observing whatever's live right now catches height changes within
      // that state (e.g. a longer set of style sections for one element type
      // vs another) that a one-time `observe()` call would miss.
      if (stylePanel !== observedRef.current) {
        if (observedRef.current) resizeObserver.unobserve(observedRef.current);
        if (stylePanel) resizeObserver.observe(stylePanel);
        observedRef.current = stylePanel;
      }
      if (!wrapRect || !stylePanel) {
        setDropdownTop(null);
        return;
      }
      const rect = stylePanel.getBoundingClientRect();
      if (rect.bottom <= wrapRect.top) {
        setDropdownTop(null); // no overlap — default position is fine
        return;
      }
      setDropdownTop(rect.bottom - wrapRect.top + 8);
    }
    recompute();
    // The style panel mounting/unmounting (tool switched to/from selection,
    // selection cleared/made) is a DOM change ResizeObserver alone won't
    // catch since there's nothing to observe before it exists — watch for
    // that via MutationObserver on a stable ancestor instead.
    const mutationObserver = new MutationObserver(recompute);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", recompute);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", recompute);
    };
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
    downloadFile(exportToJSON(elements, appState.canvasBackground), "drawing.drawdp");
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
          <button onClick={openImport}>Open .drawdp file…</button>
          <button onClick={handleExportJSON}>Save as .drawdp (JSON)</button>
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
      {/* .excalidraw stays accepted for backward compatibility with files saved before the .drawdp rename */}
      <input ref={fileInputRef} type="file" accept=".drawdp,.excalidraw,.json" style={{ display: "none" }} onChange={onImportFile} />
    </div>
  );
}
