import type { ToolType } from "../types";

export interface ToolDef {
  type: ToolType;
  label: string;
  key: string;
  icon: string;
}

export const TOOLS: ToolDef[] = [
  { type: "selection", label: "Selection", key: "1", icon: "cursor" },
  { type: "hand", label: "Hand (pan)", key: "H", icon: "hand" },
  { type: "rectangle", label: "Rectangle", key: "2", icon: "rect" },
  { type: "diamond", label: "Diamond", key: "3", icon: "diamond" },
  { type: "ellipse", label: "Ellipse", key: "4", icon: "ellipse" },
  { type: "arrow", label: "Arrow", key: "5", icon: "arrow" },
  { type: "line", label: "Line", key: "6", icon: "line" },
  { type: "draw", label: "Draw", key: "7", icon: "draw" },
  { type: "text", label: "Text", key: "8", icon: "text" },
  { type: "image", label: "Image", key: "9", icon: "image" },
  { type: "eraser", label: "Eraser", key: "0", icon: "eraser" },
  { type: "frame", label: "Frame", key: "F", icon: "frame" },
];

export const KEY_TO_TOOL: Record<string, ToolType> = {
  "1": "selection",
  v: "selection",
  "2": "rectangle",
  r: "rectangle",
  "3": "diamond",
  d: "diamond",
  "4": "ellipse",
  o: "ellipse",
  "5": "arrow",
  a: "arrow",
  "6": "line",
  l: "line",
  "7": "draw",
  p: "draw",
  "8": "text",
  t: "text",
  "9": "image",
  "0": "eraser",
  e: "eraser",
  f: "frame",
  h: "hand",
};
