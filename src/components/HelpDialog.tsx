const SHORTCUTS: [string, string][] = [
  ["V / 1", "Selection tool"],
  ["R / 2", "Rectangle"],
  ["D / 3", "Diamond"],
  ["O / 4", "Ellipse"],
  ["A / 5", "Arrow"],
  ["L / 6", "Line"],
  ["P / 7", "Draw (freehand)"],
  ["T / 8", "Text"],
  ["9", "Insert image"],
  ["E / 0", "Eraser"],
  ["F", "Frame"],
  ["H / Space-drag", "Hand (pan)"],
  ["Ctrl/Cmd + Scroll", "Zoom"],
  ["Ctrl/Cmd + Z", "Undo"],
  ["Ctrl/Cmd + Shift + Z", "Redo"],
  ["Ctrl/Cmd + D", "Duplicate"],
  ["Ctrl/Cmd + G", "Group"],
  ["Ctrl/Cmd + Shift + G", "Ungroup"],
  ["Ctrl/Cmd + A", "Select all"],
  ["Delete / Backspace", "Delete selection"],
  ["Ctrl/Cmd + K", "Command palette"],
  ["Shift + /", "This help dialog"],
  ["Right-click", "Context menu"],
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
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
      </div>
    </div>
  );
}
