import type { WhiteboardElement, AppState } from "../types";

export interface Snapshot {
  elements: WhiteboardElement[];
  selectedIds: string[];
}

const MAX_HISTORY = 100;

// `undoStack` holds the full timeline, top entry = current state.
// Undo pops the current entry and returns the one beneath it; redo replays
// what undo popped. This way `push` can simply be called after every
// mutation without the caller having to snapshot "before" state itself.
export class HistoryStack {
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private lastPushed: string | null = null;

  push(elements: WhiteboardElement[], selectedIds: string[]) {
    const serialized = JSON.stringify(elements);
    if (serialized === this.lastPushed) return;
    this.lastPushed = serialized;
    this.undoStack.push({ elements: clone(elements), selectedIds: [...selectedIds] });
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): Snapshot | null {
    if (this.undoStack.length < 2) return null;
    const top = this.undoStack.pop()!;
    this.redoStack.push(top);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.lastPushed = JSON.stringify(prev.elements);
    return prev;
  }

  redo(): Snapshot | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(next);
    this.lastPushed = JSON.stringify(next.elements);
    return next;
  }

  canUndo() {
    return this.undoStack.length > 1;
  }
  canRedo() {
    return this.redoStack.length > 0;
  }
}

function clone(elements: WhiteboardElement[]): WhiteboardElement[] {
  return JSON.parse(JSON.stringify(elements));
}

export function defaultAppState(): AppState {
  return {
    tool: "selection",
    currentStyle: {
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "hachure",
      strokeWidth: "thin",
      strokeStyle: "solid",
      roughness: "artist",
      edges: "sharp",
      opacity: 100,
    },
    currentFontFamily: "hand-drawn",
    currentFontSize: 20,
    currentTextAlign: "left",
    currentStartArrowhead: "none",
    currentEndArrowhead: "arrow",
    selectedIds: [],
    editingTextId: null,
    editingPointsId: null,
    croppingId: null,
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
    theme: "light",
    canvasBackground: "#ffffff",
    gridEnabled: false,
    isDragging: false,
    tutorialOpen: false,
  };
}
