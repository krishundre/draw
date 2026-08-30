import { newId, randomSeed } from "../utils/id";
import type {
  AppState,
  ArrowElement,
  DiamondElement,
  DrawElement,
  EllipseElement,
  FrameElement,
  ImageElement,
  LineElement,
  RectangleElement,
  TextElement,
  ToolType,
  WhiteboardElement,
} from "../types";

function base(appState: AppState, type: ToolType, x: number, y: number, zIndex: number) {
  return {
    id: newId(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    seed: randomSeed(),
    version: 1,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    locked: false,
    zIndex,
    ...appState.currentStyle,
  };
}

export function createElement(appState: AppState, type: ToolType, x: number, y: number, zIndex: number): WhiteboardElement | null {
  switch (type) {
    case "rectangle":
      return { ...base(appState, type, x, y, zIndex) } as RectangleElement;
    case "diamond":
      return { ...base(appState, type, x, y, zIndex) } as DiamondElement;
    case "ellipse":
      return { ...base(appState, type, x, y, zIndex) } as EllipseElement;
    case "frame":
      return { ...base(appState, "frame", x, y, zIndex), name: "Frame" } as FrameElement;
    case "line":
      return {
        ...base(appState, "line", x, y, zIndex),
        points: [{ x: 0, y: 0 }],
      } as LineElement;
    case "arrow":
      return {
        ...base(appState, "arrow", x, y, zIndex),
        points: [{ x: 0, y: 0 }],
        startArrowhead: appState.currentStartArrowhead,
        endArrowhead: appState.currentEndArrowhead,
        startBinding: null,
        endBinding: null,
      } as ArrowElement;
    case "draw":
      return {
        ...base(appState, "draw", x, y, zIndex),
        points: [{ x: 0, y: 0 }],
      } as DrawElement;
    case "text":
      return {
        ...base(appState, "text", x, y, zIndex),
        text: "",
        fontFamily: appState.currentFontFamily,
        fontSize: appState.currentFontSize,
        textAlign: appState.currentTextAlign,
        containerId: null,
        height: appState.currentFontSize * 1.25,
      } as TextElement;
    default:
      return null;
  }
}

export function createImageElement(appState: AppState, x: number, y: number, zIndex: number, dataURL: string, width: number, height: number): ImageElement {
  return {
    ...base(appState, "image", x, y, zIndex),
    width,
    height,
    fileId: newId(),
    dataURL,
  } as ImageElement;
}
