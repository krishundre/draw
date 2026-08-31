import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { getCombinedBounds } from "../canvas/geometry";
import { useAdaptiveContrast } from "../theme/useAdaptiveContrast";

// A small number input that edits a combined-bounds value (X/Y/W/H) for the
// current selection. Local text state so mid-typing values ("-", "12.") don't
// get clobbered by the next store re-render; the store update (and the single
// undo/redo entry for it) only fires on blur/Enter, not per keystroke.
function StatInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(Math.round(value)));

  useEffect(() => {
    setText(String(Math.round(value)));
  }, [value]);

  function commit() {
    const n = Number(text);
    if (Number.isFinite(n)) onCommit(n);
    else setText(String(Math.round(value)));
  }

  return (
    <input
      className="stats-input"
      type="number"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(String(Math.round(value)));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function StatsPanel() {
  const { elements, appState, updateElement, commitHistory, syncBoundArrows, syncBoundText } = useStore();
  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));
  const bounds = selected.length ? getCombinedBounds(selected) : null;
  const { ref, background } = useAdaptiveContrast<HTMLDivElement>();

  function setX(newX: number) {
    if (!bounds) return;
    const dx = newX - bounds.x1;
    if (!dx) return;
    if (selected.length === 1) updateElement(selected[0].id, { x: selected[0].x + dx });
    else selected.forEach((el) => updateElement(el.id, { x: el.x + dx }));
    const ids = selected.map((el) => el.id);
    syncBoundArrows(ids);
    syncBoundText(ids);
    commitHistory();
  }
  function setY(newY: number) {
    if (!bounds) return;
    const dy = newY - bounds.y1;
    if (!dy) return;
    if (selected.length === 1) updateElement(selected[0].id, { y: selected[0].y + dy });
    else selected.forEach((el) => updateElement(el.id, { y: el.y + dy }));
    const ids = selected.map((el) => el.id);
    syncBoundArrows(ids);
    syncBoundText(ids);
    commitHistory();
  }

  function setWidth(newW: number) {
    if (!bounds || selected.length !== 1) return; // scaling a multi-selection from stats isn't supported — use the resize handles
    const el = selected[0];
    if (newW <= 0 || newW === el.width) return;
    updateElement(el.id, { width: newW });
    syncBoundArrows([el.id]);
    syncBoundText([el.id]);
    commitHistory();
  }
  function setHeight(newH: number) {
    if (!bounds || selected.length !== 1) return;
    const el = selected[0];
    if (newH <= 0 || newH === el.height) return;
    updateElement(el.id, { height: newH });
    syncBoundArrows([el.id]);
    syncBoundText([el.id]);
    commitHistory();
  }

  return (
    <div className="dropdown stats-dropdown" ref={ref} data-bg={background ?? undefined}>
      <div className="stats-row">
        <span>Elements</span>
        <span>{elements.length}</span>
      </div>
      <div className="stats-row">
        <span>Selected</span>
        <span>{selected.length}</span>
      </div>
      {bounds && (
        <>
          <div className="stats-row">
            <span>X, Y</span>
            <span className="stats-input-pair">
              <StatInput value={bounds.x1} onCommit={setX} />
              <StatInput value={bounds.y1} onCommit={setY} />
            </span>
          </div>
          <div className="stats-row">
            <span>W, H</span>
            <span className="stats-input-pair">
              <StatInput value={bounds.x2 - bounds.x1} onCommit={setWidth} />
              <StatInput value={bounds.y2 - bounds.y1} onCommit={setHeight} />
            </span>
          </div>
        </>
      )}
      <div className="stats-row">
        <span>Zoom</span>
        <span>{Math.round(appState.zoom * 100)}%</span>
      </div>
    </div>
  );
}
