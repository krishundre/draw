export type ToolType =
  | "selection"
  | "lasso"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "draw"
  | "text"
  | "image"
  | "embed"
  | "eraser"
  | "frame"
  | "hand";

export type FillStyle = "hachure" | "cross-hatch" | "solid";
export type StrokeWidth = "thin" | "bold" | "extra-bold";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type Roughness = "architect" | "artist" | "cartoonist";
export type EdgeStyle = "sharp" | "round";
export type ArrowheadStyle = "none" | "arrow" | "triangle" | "dot" | "bar";
export type FontFamily = "hand-drawn" | "normal" | "code";
export type TextAlign = "left" | "center" | "right";

export interface Point {
  x: number;
  y: number;
}

export interface ElementStyle {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle: StrokeStyle;
  roughness: Roughness;
  edges: EdgeStyle;
  opacity: number; // 0-100
}

export interface BaseElement extends ElementStyle {
  id: string;
  type: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number; // radians
  seed: number;
  version: number;
  isDeleted: boolean;
  groupIds: string[];
  frameId: string | null;
  locked: boolean;
  zIndex: number;
  link: string | null;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
}
export interface DiamondElement extends BaseElement {
  type: "diamond";
}
export interface EllipseElement extends BaseElement {
  type: "ellipse";
}
export interface FrameElement extends BaseElement {
  type: "frame";
  name: string;
}
export interface DrawElement extends BaseElement {
  type: "draw";
  points: Point[];
}
export interface LineElement extends BaseElement {
  type: "line";
  points: Point[];
}
export interface ArrowElement extends BaseElement {
  type: "arrow";
  points: Point[];
  startArrowhead: ArrowheadStyle;
  endArrowhead: ArrowheadStyle;
  startBinding: Binding | null;
  endBinding: Binding | null;
  // When true, points are treated only as anchors — the displayed path is
  // computed at render time as an orthogonal (horizontal/vertical-only) route
  // between them, flowchart-connector style. See src/canvas/elbow.ts.
  elbowed: boolean;
}
export interface Binding {
  elementId: string;
  focus: number;
  gap: number;
}
export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  textAlign: TextAlign;
  containerId: string | null;
}
export interface ImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ImageElement extends BaseElement {
  type: "image";
  fileId: string;
  dataURL: string;
  crop: ImageCrop | null;
}
export interface EmbedElement extends BaseElement {
  type: "embed";
  url: string;
}

export type WhiteboardElement =
  | RectangleElement
  | DiamondElement
  | EllipseElement
  | FrameElement
  | DrawElement
  | LineElement
  | ArrowElement
  | TextElement
  | ImageElement
  | EmbedElement;

export interface AppState {
  tool: ToolType;
  currentStyle: ElementStyle;
  currentFontFamily: FontFamily;
  currentFontSize: number;
  currentTextAlign: TextAlign;
  currentStartArrowhead: ArrowheadStyle;
  currentEndArrowhead: ArrowheadStyle;
  currentElbowed: boolean;
  selectedIds: string[];
  editingTextId: string | null;
  editingPointsId: string | null;
  croppingId: string | null;
  interactingEmbedId: string | null;
  scrollX: number;
  scrollY: number;
  zoom: number;
  theme: "light" | "dark";
  canvasBackground: string;
  gridEnabled: boolean;
  isDragging: boolean;
  tutorialOpen: boolean;
}

export interface LibraryItem {
  id: string;
  elements: WhiteboardElement[];
  name?: string;
  source?: "custom" | "imported";
}
