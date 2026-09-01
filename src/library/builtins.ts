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
    link: null,
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

// A bound, elbow-routed connector between two shapes already placed on the
// canvas — used to pre-wire the flowchart library presets below.
function elbowArrow(from: WhiteboardElement, to: WhiteboardElement): WhiteboardElement {
  const start = { x: from.x + from.width / 2, y: from.y + from.height };
  const end = { x: to.x + to.width / 2, y: to.y };
  return {
    id: newId(),
    type: "arrow",
    x: start.x,
    y: start.y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    angle: 0,
    seed: randomSeed(),
    version: 1,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    locked: false,
    zIndex: 0,
    link: null,
    ...style,
    points: [
      { x: 0, y: 0 },
      { x: end.x - start.x, y: end.y - start.y },
    ],
    startArrowhead: "none",
    endArrowhead: "arrow",
    startBinding: { elementId: from.id, focus: 0, gap: 4 },
    endBinding: { elementId: to.id, focus: 0, gap: 4 },
    elbowed: true,
  } as WhiteboardElement;
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
  (() => {
    const start = rect(60, 0, 100, 50, { edges: "round" });
    const decision = diamond(30, 90, 160, 90);
    const yes = rect(0, 230, 100, 50, { backgroundColor: "#b2f2bb" });
    const no = rect(190, 230, 100, 50, { backgroundColor: "#ffc9c9" });
    return {
      id: "lib-flowchart-decision",
      name: "Flowchart: decision",
      elements: [start, decision, yes, no, elbowArrow(start, decision), elbowArrow(decision, yes), elbowArrow(decision, no)],
    };
  })(),
];
