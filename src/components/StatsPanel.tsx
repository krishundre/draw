import { useStore } from "../state/store";
import { getCombinedBounds } from "../canvas/geometry";

export function StatsPanel() {
  const { elements, appState } = useStore();
  const selected = elements.filter((e) => appState.selectedIds.includes(e.id));
  const bounds = selected.length ? getCombinedBounds(selected) : null;

  return (
    <div className="dropdown stats-dropdown">
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
            <span>
              {Math.round(bounds.x1)}, {Math.round(bounds.y1)}
            </span>
          </div>
          <div className="stats-row">
            <span>W, H</span>
            <span>
              {Math.round(bounds.x2 - bounds.x1)}, {Math.round(bounds.y2 - bounds.y1)}
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
