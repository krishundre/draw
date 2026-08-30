import { create } from "zustand";
import * as Y from "yjs";
import { ydoc, yElements, persistenceReady } from "../collab/doc";
import { HistoryStack, defaultAppState } from "./history";
import type { AppState, ElementStyle, WhiteboardElement, ToolType } from "../types";

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
