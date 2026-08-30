import { newId, randomSeed } from "../utils/id";
import type { LibraryItem, WhiteboardElement } from "../types";
import { defaultAppState } from "../state/history";

const style = defaultAppState().currentStyle;

function rect(x: number, y: number, w: number, h: number, extra: Partial<WhiteboardElement> = {}): WhiteboardElement {
  return {
    id: newId(),
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    angle: 0,
    seed: randomSeed(),
    version: 1,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    locked: false,
    zIndex: 0,
    ...style,
    ...extra,
  } as WhiteboardElement;
}

function ellipse(x: number, y: number, w: number, h: number): WhiteboardElement {
  return { ...rect(x, y, w, h), type: "ellipse" } as WhiteboardElement;
}

function diamond(x: number, y: number, w: number, h: number): WhiteboardElement {
  return { ...rect(x, y, w, h), type: "diamond" } as WhiteboardElement;
}

export const BUILTIN_LIBRARY: LibraryItem[] = [
  { id: "lib-rect", name: "Rectangle", elements: [rect(0, 0, 80, 60)] },
  { id: "lib-ellipse", name: "Ellipse", elements: [ellipse(0, 0, 80, 60)] },
  { id: "lib-diamond", name: "Diamond", elements: [diamond(0, 0, 80, 60)] },
  {
    id: "lib-flow",
    name: "Flow: box + box",
    elements: [rect(0, 0, 90, 50), rect(150, 0, 90, 50, { backgroundColor: "#a5d8ff" })],
  },
];
