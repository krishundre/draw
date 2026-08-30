import { useStore } from "../state/store";
import { Icon } from "./Icon";

export function BottomBar() {
  const { appState, setAppState, undo, redo, canUndo, canRedo } = useStore();

  function zoomTo(z: number) {
    setAppState({ zoom: Math.min(30, Math.max(0.1, z)) });
  }

  function resetZoom() {
    setAppState({ zoom: 1, scrollX: 0, scrollY: 0 });
  }

  return (
    <div className="bottom-bar">
      <div className="zoom-controls">
        <button onClick={() => zoomTo(appState.zoom - 0.1)}>−</button>
        <button onClick={resetZoom} title="Reset zoom">
          {Math.round(appState.zoom * 100)}%
        </button>
        <button onClick={() => zoomTo(appState.zoom + 0.1)}>+</button>
      </div>
      <div className="history-controls">
        <button disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">
          <Icon name="redo" />
        </button>
      </div>
    </div>
  );
}
