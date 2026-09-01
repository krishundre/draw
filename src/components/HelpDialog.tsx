import { useStore } from "../state/store";

const SHORTCUTS: [string, string][] = [
  ["V / 1", "Selection tool"],
  ["Q", "Lasso (freeform) selection"],
  ["R / 2", "Rectangle"],
  ["D / 3", "Diamond"],
  ["O / 4", "Ellipse"],
  ["A / 5", "Arrow"],
  ["L / 6", "Line"],
  ["P / 7", "Draw (freehand)"],
  ["T / 8", "Text"],
  ["9", "Insert image"],
  ["W", "Embed a web page (YouTube, Figma, etc.)"],
  ["E / 0", "Eraser"],
  ["F", "Frame"],
  ["H / Space-drag", "Hand (pan)"],
  ["Click, click, … (line/arrow tool)", "Multi-point line/arrow — click to place each point"],
  ["Enter / Esc (while placing points)", "Finish / cancel the multi-point line or arrow"],
  ["Double-click a line/arrow", "Edit its points — drag to move, click a segment to add, Alt+click to remove"],
  ["Double-click a shape", "Add/edit a text label bound to it"],
  ["Ctrl/Cmd + Scroll", "Zoom"],
  ["Ctrl/Cmd + Z", "Undo"],
  ["Ctrl/Cmd + Shift + Z", "Redo"],
  ["Ctrl/Cmd + C / V", "Copy / paste"],
  ["Ctrl/Cmd + D", "Duplicate"],
  ["Ctrl/Cmd + G", "Group"],
  ["Ctrl/Cmd + Shift + G", "Ungroup"],
  ["Ctrl/Cmd + A", "Select all"],
  ["Delete / Backspace", "Delete selection"],
  ["Ctrl/Cmd + K", "Command palette"],
  ["Ctrl/Cmd + Shift + F", "Search elements"],
  ["Shift + /", "This help dialog"],
  ["Right-click", "Context menu (align, distribute, link, crop, etc.)"],
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const setAppState = useStore((s) => s.setAppState);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>Keyboard shortcuts</h2>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="help-grid">
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} className="help-row">
              <kbd>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="help-footer">
          <button
            className="help-replay-tutorial"
            onClick={() => {
              setAppState({ tutorialOpen: true });
              onClose();
            }}
          >
            Replay the getting-started tour
          </button>
        </div>
      </div>
    </div>
  );
}
