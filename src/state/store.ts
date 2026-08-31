import { create } from "zustand";
import * as Y from "yjs";
import { ydoc, yElements, persistenceReady } from "../collab/doc";
import { HistoryStack, defaultAppState } from "./history";
import type { AppState, ElementStyle, WhiteboardElement, ToolType, ArrowElement, TextElement } from "../types";
import { getElementBounds, getCombinedBounds } from "../canvas/geometry";
import { getEdgePointTowards } from "../canvas/binding";
import { layoutBoundText } from "../canvas/text";

export type AlignMode = "left" | "right" | "centerH" | "top" | "bottom" | "centerV";
export type DistributeAxis = "horizontal" | "vertical";

const history = new HistoryStack();

interface Store {
  elements: WhiteboardElement[];
  appState: AppState;
  canUndo: boolean;
  canRedo: boolean;

  setTool: (tool: ToolType) => void;
  setAppState: (partial: Partial<AppState>) => void;
  setStyle: (partial: Partial<ElementStyle>) => void;
  setSelectedIds: (ids: string[]) => void;

  addElement: (el: WhiteboardElement) => void;
  addElements: (els: WhiteboardElement[]) => void;
  updateElement: (id: string, partial: Partial<WhiteboardElement>) => void;
  updateElements: (ids: string[], partial: Partial<WhiteboardElement>) => void;
  deleteElements: (ids: string[]) => void;
  setAllElements: (els: WhiteboardElement[]) => void;

  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  group: (ids: string[]) => void;
  ungroup: (ids: string[]) => void;

  alignElements: (ids: string[], mode: AlignMode) => void;
  distributeElements: (ids: string[], axis: DistributeAxis) => void;
  syncBoundArrows: (changedIds: string[]) => void;
  syncBoundText: (changedContainerIds: string[]) => void;

  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
}

function elementsFromY(): WhiteboardElement[] {
  return Array.from(yElements.values())
    .filter((e) => !e.isDeleted)
    .sort((a, b) => a.zIndex - b.zIndex);
}

function nextZIndex(): number {
  const all = Array.from(yElements.values());
  return all.length ? Math.max(...all.map((e) => e.zIndex)) + 1 : 0;
}

export const useStore = create<Store>((set, get) => {
  yElements.observeDeep(() => {
    set({ elements: elementsFromY() });
  });

  return {
    elements: elementsFromY(),
    appState: defaultAppState(),
    canUndo: false,
    canRedo: false,

    setTool: (tool) => set((s) => ({ appState: { ...s.appState, tool, selectedIds: tool === "selection" ? s.appState.selectedIds : [] } })),
    setAppState: (partial) => set((s) => ({ appState: { ...s.appState, ...partial } })),
    setStyle: (partial) =>
      set((s) => ({ appState: { ...s.appState, currentStyle: { ...s.appState.currentStyle, ...partial } } })),
    setSelectedIds: (ids) => set((s) => ({ appState: { ...s.appState, selectedIds: ids } })),

    addElement: (el) => {
      ydoc.transact(() => yElements.set(el.id, el));
    },
    addElements: (els) => {
      ydoc.transact(() => els.forEach((el) => yElements.set(el.id, el)));
    },
    updateElement: (id, partial) => {
      ydoc.transact(() => {
        const cur = yElements.get(id);
        if (!cur) return;
        yElements.set(id, { ...cur, ...partial, version: cur.version + 1 } as WhiteboardElement);
      });
    },
    updateElements: (ids, partial) => {
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (!cur) return;
          yElements.set(id, { ...cur, ...partial, version: cur.version + 1 } as WhiteboardElement);
        });
      });
    },
    deleteElements: (ids) => {
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, isDeleted: true });
        });
      });
      get().commitHistory();
    },
    setAllElements: (els) => {
      ydoc.transact(() => {
        yElements.clear();
        els.forEach((el) => yElements.set(el.id, el));
      });
    },

    bringToFront: (ids) => {
      const z = nextZIndex();
      ydoc.transact(() => {
        ids.forEach((id, i) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, zIndex: z + i });
        });
      });
      get().commitHistory();
    },
    sendToBack: (ids) => {
      const all = Array.from(yElements.values());
      const minZ = all.length ? Math.min(...all.map((e) => e.zIndex)) : 0;
      ydoc.transact(() => {
        ids.forEach((id, i) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, zIndex: minZ - ids.length + i });
        });
      });
      get().commitHistory();
    },
    bringForward: (ids) => {
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, zIndex: cur.zIndex + 1.5 });
        });
      });
      get().commitHistory();
    },
    sendBackward: (ids) => {
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, zIndex: cur.zIndex - 1.5 });
        });
      });
      get().commitHistory();
    },

    group: (ids) => {
      if (ids.length < 2) return;
      const groupId = crypto.randomUUID();
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, groupIds: [...cur.groupIds, groupId] });
        });
      });
      get().commitHistory();
    },
    ungroup: (ids) => {
      ydoc.transact(() => {
        ids.forEach((id) => {
          const cur = yElements.get(id);
          if (cur) yElements.set(id, { ...cur, groupIds: [] });
        });
      });
      get().commitHistory();
    },

    alignElements: (ids, mode) => {
      const { elements } = get();
      const targets = elements.filter((e) => ids.includes(e.id));
      if (targets.length < 2) return;
      const combined = getCombinedBounds(targets);
      ydoc.transact(() => {
        targets.forEach((el) => {
          const b = getElementBounds(el);
          let dx = 0;
          let dy = 0;
          if (mode === "left") dx = combined.x1 - b.x1;
          else if (mode === "right") dx = combined.x2 - b.x2;
          else if (mode === "centerH") dx = (combined.x1 + combined.x2) / 2 - (b.x1 + b.x2) / 2;
          else if (mode === "top") dy = combined.y1 - b.y1;
          else if (mode === "bottom") dy = combined.y2 - b.y2;
          else if (mode === "centerV") dy = (combined.y1 + combined.y2) / 2 - (b.y1 + b.y2) / 2;
          if (!dx && !dy) return;
          const cur = yElements.get(el.id);
          if (cur) yElements.set(el.id, { ...cur, x: cur.x + dx, y: cur.y + dy, version: cur.version + 1 });
        });
      });
      get().syncBoundArrows(ids);
      get().syncBoundText(ids);
      get().commitHistory();
    },

    distributeElements: (ids, axis) => {
      const { elements } = get();
      const targets = elements.filter((e) => ids.includes(e.id));
      if (targets.length < 3) return;
      const withBounds = targets.map((el) => ({ el, b: getElementBounds(el) }));
      ydoc.transact(() => {
        if (axis === "horizontal") {
          withBounds.sort((a, b) => a.b.x1 - b.b.x1);
          const first = withBounds[0];
          const last = withBounds[withBounds.length - 1];
          const totalSpan = last.b.x2 - first.b.x1;
          const totalWidth = withBounds.reduce((s, w) => s + (w.b.x2 - w.b.x1), 0);
          const gap = (totalSpan - totalWidth) / (withBounds.length - 1);
          let cursor = first.b.x1;
          withBounds.forEach(({ el, b }) => {
            const dx = cursor - b.x1;
            const cur = yElements.get(el.id);
            if (cur) yElements.set(el.id, { ...cur, x: cur.x + dx, version: cur.version + 1 });
            cursor += b.x2 - b.x1 + gap;
          });
        } else {
          withBounds.sort((a, b) => a.b.y1 - b.b.y1);
          const first = withBounds[0];
          const last = withBounds[withBounds.length - 1];
          const totalSpan = last.b.y2 - first.b.y1;
          const totalHeight = withBounds.reduce((s, w) => s + (w.b.y2 - w.b.y1), 0);
          const gap = (totalSpan - totalHeight) / (withBounds.length - 1);
          let cursor = first.b.y1;
          withBounds.forEach(({ el, b }) => {
            const dy = cursor - b.y1;
            const cur = yElements.get(el.id);
            if (cur) yElements.set(el.id, { ...cur, y: cur.y + dy, version: cur.version + 1 });
            cursor += b.y2 - b.y1 + gap;
          });
        }
      });
      get().syncBoundArrows(ids);
      get().syncBoundText(ids);
      get().commitHistory();
    },

    // Keeps arrow endpoints bound to shapes (via startBinding/endBinding)
    // glued to those shapes' edges after the shapes (identified by
    // `changedIds`) moved, resized, or were dragged as part of an align/
    // distribute/nudge operation. Idempotent — recomputes each bound endpoint
    // purely from the current shape position and the arrow's other endpoint,
    // so calling it after every batch of position changes is safe.
    syncBoundArrows: (changedIds) => {
      if (!changedIds.length) return;
      const { elements } = get();
      const changed = new Set(changedIds);
      const arrows = elements.filter((e) => e.type === "arrow") as ArrowElement[];
      const relevant = arrows.filter(
        (a) => (a.startBinding && changed.has(a.startBinding.elementId)) || (a.endBinding && changed.has(a.endBinding.elementId))
      );
      if (!relevant.length) return;
      ydoc.transact(() => {
        relevant.forEach((a) => {
          const cur = yElements.get(a.id) as ArrowElement | undefined;
          if (!cur) return;
          let points = cur.points;
          if (cur.startBinding && changed.has(cur.startBinding.elementId)) {
            const shape = elements.find((e) => e.id === cur.startBinding!.elementId);
            if (shape) {
              const other = { x: cur.x + points[points.length - 1].x, y: cur.y + points[points.length - 1].y };
              const edge = getEdgePointTowards(shape, other.x, other.y, cur.startBinding.gap);
              points = [...points];
              points[0] = { x: edge.x - cur.x, y: edge.y - cur.y };
            }
          }
          if (cur.endBinding && changed.has(cur.endBinding.elementId)) {
            const shape = elements.find((e) => e.id === cur.endBinding!.elementId);
            if (shape) {
              const other = { x: cur.x + points[0].x, y: cur.y + points[0].y };
              const edge = getEdgePointTowards(shape, other.x, other.y, cur.endBinding.gap);
              points = [...points];
              points[points.length - 1] = { x: edge.x - cur.x, y: edge.y - cur.y };
            }
          }
          if (points !== cur.points) {
            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            yElements.set(a.id, {
              ...cur,
              points,
              width: Math.max(...xs) - Math.min(...xs),
              height: Math.max(...ys) - Math.min(...ys),
              version: cur.version + 1,
            });
          }
        });
      });
    },

    // Keeps a container's bound text (containerId) centered and wrapped to
    // its current bounds after the container moves or resizes — pure
    // recompute from current position each time, so it's safe to call after
    // every kind of transform (drag, resize handle, nudge, align, distribute).
    syncBoundText: (changedContainerIds) => {
      if (!changedContainerIds.length) return;
      const { elements } = get();
      const ids = new Set(changedContainerIds);
      const texts = elements.filter((e) => e.type === "text" && (e as TextElement).containerId && ids.has((e as TextElement).containerId!)) as TextElement[];
      if (!texts.length) return;
      ydoc.transact(() => {
        texts.forEach((text) => {
          const container = elements.find((e) => e.id === text.containerId);
          if (!container) return;
          const layout = layoutBoundText(container, text.text, text.fontSize, text.fontFamily);
          const cur = yElements.get(text.id);
          if (cur) yElements.set(text.id, { ...cur, ...layout, version: cur.version + 1 });
        });
      });
    },

    commitHistory: () => {
      const { elements, appState } = get();
      history.push(elements, appState.selectedIds);
      set({ canUndo: history.canUndo(), canRedo: history.canRedo() });
    },
    undo: () => {
      const snap = history.undo();
      if (!snap) return;
      get().setAllElements(snap.elements);
      set((s) => ({
        appState: { ...s.appState, selectedIds: snap.selectedIds },
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      }));
    },
    redo: () => {
      const snap = history.redo();
      if (!snap) return;
      get().setAllElements(snap.elements);
      set((s) => ({
        appState: { ...s.appState, selectedIds: snap.selectedIds },
        canUndo: history.canUndo(),
        canRedo: history.canRedo(),
      }));
    },
  };
});

// seed the undo baseline once persisted state (if any) has loaded, so the
// very first user action can be undone back to what was actually restored
persistenceReady.then(() => {
  useStore.getState().commitHistory();
});

export { Y };
