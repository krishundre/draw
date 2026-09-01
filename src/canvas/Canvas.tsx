import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../state/store";
import { renderScene, getCachedImage } from "./render";
import { createElement, createEmbedElement } from "./factory";
import { isEmbeddableUrl } from "../utils/embedAllowlist";
import {
  getCombinedBounds,
  getResizeHandles,
  isElementInRect,
  isElementInPolygon,
  isPointInElement,
  type HandlePosition,
} from "./geometry";
import type { ArrowElement, DrawElement, EmbedElement, ImageCrop, ImageElement, LineElement, Point, TextElement, WhiteboardElement } from "../types";
import { TextEditorOverlay } from "../components/TextEditorOverlay";
import { SelectionOverlay } from "../components/SelectionOverlay";
import { CursorsOverlay } from "../components/CursorsOverlay";
import { PointEditorOverlay } from "../components/PointEditorOverlay";
import { CropOverlay } from "../components/CropOverlay";
import { EmbedOverlay } from "../components/EmbedOverlay";
import { getProvider, onCollabConnected } from "../collab/doc";
import { setRegisteredCanvas } from "./canvasRegistry";
import { findBindableShapeAt } from "./binding";
import { layoutBoundText } from "./text";

const POINT_HIT_RADIUS = 10; // screen px

type DragMode =
  | { kind: "none" }
  | { kind: "drawing"; elementId: string; startX: number; startY: number }
  | { kind: "multipoint"; elementId: string }
  | { kind: "moving"; startX: number; startY: number; origin: Map<string, { x: number; y: number }> }
  | { kind: "resizing"; handle: HandlePosition; startX: number; startY: number; startBounds: { x1: number; y1: number; x2: number; y2: number }; origin: Map<string, WhiteboardElement> }
  | { kind: "rotating"; centerX: number; centerY: number; startAngle: number; origin: Map<string, number> }
  | { kind: "panning"; startX: number; startY: number; startScrollX: number; startScrollY: number }
  | { kind: "selecting"; startX: number; startY: number; endX: number; endY: number }
  | { kind: "lassoing"; points: Point[] }
  | { kind: "editingPoint"; elementId: string; pointIndex: number }
  | {
      kind: "cropping";
      elementId: string;
      handle: HandlePosition | "move";
      startX: number;
      startY: number;
      startCrop: ImageCrop;
      startBounds: { x: number; y: number; width: number; height: number };
    }
  | { kind: "erasing" }
  | { kind: "pinching"; startDistance: number; startZoom: number; startScrollX: number; startScrollY: number; startMidX: number; startMidY: number };

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode>({ kind: "none" });
  const spaceHeld = useRef(false);
  // Active touch pointers, for pinch-zoom / two-finger pan. Tracked separately
  // from dragRef's single-pointer drawing/selection states so a second finger
  // landing mid-gesture can cleanly interrupt whatever the first finger started.
  const touchesRef = useRef<Map<number, Point>>(new Map());
  const [, forceRender] = useState(0);
  // The live cursor position while placing a multi-point line/arrow (click,
  // click, click…) — used only to draw the rubber-band preview segment from
  // the last placed point to the pointer; not part of dragRef because it
  // updates on hover, between the discrete clicks that actually add points.
  const multipointCursorRef = useRef<Point | null>(null);
  const cropEntrySnapshotRef = useRef<ImageCrop | null>(null);

  const { elements, appState, setAppState, addElement, updateElement, deleteElements, commitHistory, setSelectedIds, setTool, syncBoundArrows, syncBoundText } = useStore();
  const editingPointsId = appState.editingPointsId;
  const croppingId = appState.croppingId;
  const interactingEmbedId = appState.interactingEmbedId;
  const setEditingPointsId = (id: string | null) => setAppState({ editingPointsId: id });
  const setCroppingId = (id: string | null) => setAppState({ croppingId: id });
  const setInteractingEmbedId = (id: string | null) => setAppState({ interactingEmbedId: id });

  // Point-edit / crop / embed-interact mode are ephemeral UI-only appState
  // fields (like editingTextId) — kept in the store rather than local state
  // so other components (the context menu's "Crop image" entry) can trigger
  // them. Drop out automatically whenever the element being edited is no
  // longer the (sole) selection, so switching tools, selecting something
  // else, or pressing Escape (which clears selection) all exit cleanly.
  useEffect(() => {
    if (editingPointsId && !appState.selectedIds.includes(editingPointsId)) setEditingPointsId(null);
  }, [appState.selectedIds, editingPointsId]);
  useEffect(() => {
    if (croppingId && !appState.selectedIds.includes(croppingId)) setCroppingId(null);
  }, [appState.selectedIds, croppingId]);
  useEffect(() => {
    if (interactingEmbedId && !appState.selectedIds.includes(interactingEmbedId)) setInteractingEmbedId(null);
  }, [appState.selectedIds, interactingEmbedId]);

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left - appState.scrollX) / appState.zoom,
        y: (clientY - rect.top - appState.scrollY) / appState.zoom,
      };
    },
    [appState.scrollX, appState.scrollY, appState.zoom]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderScene(ctx, elements, {
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
      background: appState.canvasBackground,
      width: w,
      height: h,
      grid: appState.gridEnabled,
      theme: appState.theme,
    });
  }, [elements, appState]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    setRegisteredCanvas(canvasRef.current);
    return () => setRegisteredCanvas(null);
  }, []);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  // space-to-pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceHeld.current) {
        spaceHeld.current = true;
        forceRender((n) => n + 1);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        forceRender((n) => n + 1);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const selectedElements = elements.filter((e) => appState.selectedIds.includes(e.id));
  const combinedBounds = selectedElements.length ? getCombinedBounds(selectedElements) : null;

  function topElementAt(x: number, y: number): WhiteboardElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.locked) continue;
      if (isPointInElement(x, y, el)) return el;
    }
    return null;
  }

  // Resolves an arrow's endBinding against whatever shape its final point
  // lands on, then snaps both endpoints to their shapes' edges. Shared by the
  // classic 2-point drag-to-draw finish and the multi-point click-chain finish.
  function finalizeArrowBinding(arrowId: string) {
    const a = useStore.getState().elements.find((x) => x.id === arrowId) as ArrowElement | undefined;
    if (!a) return;
    const lastPoint = a.points[a.points.length - 1];
    const endWorld = { x: a.x + lastPoint.x, y: a.y + lastPoint.y };
    const endShape = findBindableShapeAt(useStore.getState().elements, endWorld.x, endWorld.y, a.startBinding?.elementId);
    if (endShape) updateElement(a.id, { endBinding: { elementId: endShape.id, focus: 0, gap: 4 } } as Partial<WhiteboardElement>);
    const shapeIds = [a.startBinding?.elementId, endShape?.id].filter((x): x is string => Boolean(x));
    if (shapeIds.length) {
      // Two passes: the first snaps the start point using the raw end point,
      // the second (now that the start may have moved) snaps the end point
      // to its final position — cheap and avoids solving both simultaneously.
      syncBoundArrows(shapeIds);
      syncBoundArrows(shapeIds);
    }
  }

  function finishMultipoint(elementId: string) {
    const el = useStore.getState().elements.find((x) => x.id === elementId);
    if (!el || el.width + el.height < 2) {
      deleteElements([elementId]);
    } else {
      if (el.type === "arrow") finalizeArrowBinding(elementId);
      setSelectedIds([elementId]);
      commitHistory();
    }
    dragRef.current = { kind: "none" };
    multipointCursorRef.current = null;
    setTool(appState.tool === "draw" ? "draw" : "selection");
    forceRender((n) => n + 1);
  }

  function cancelMultipoint(elementId: string) {
    deleteElements([elementId]);
    dragRef.current = { kind: "none" };
    multipointCursorRef.current = null;
    setTool(appState.tool === "draw" ? "draw" : "selection");
    forceRender((n) => n + 1);
  }

  // Enter/Escape finish or cancel a multi-point line/arrow chain, and (while
  // point-editing an existing line/arrow) provide a mouse-free way to add or
  // remove a point — the exact positioning of a new point still benefits from
  // the mouse, same as the plain 2-point drag-to-draw this extends has no
  // keyboard equivalent for *where* to draw either.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const d = dragRef.current;
      if (d.kind === "multipoint") {
        if (e.key === "Enter") {
          e.preventDefault();
          finishMultipoint(d.elementId);
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelMultipoint(d.elementId);
        }
        return;
      }
      if (croppingId) {
        if (e.key === "Escape") {
          e.preventDefault();
          updateElement(croppingId, { crop: cropEntrySnapshotRef.current } as Partial<WhiteboardElement>);
          setCroppingId(null);
        } else if (e.key === "Enter") {
          e.preventDefault();
          commitHistory();
          setCroppingId(null);
        }
        return;
      }
      if (editingPointsId) {
        const el = elements.find((x) => x.id === editingPointsId) as LineElement | ArrowElement | undefined;
        if (!el) return;
        if (e.key === "Escape") {
          setEditingPointsId(null);
        } else if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          const mid = { x: (el.points[0].x + el.points[1].x) / 2, y: (el.points[0].y + el.points[1].y) / 2 };
          const points = [el.points[0], mid, ...el.points.slice(1)];
          commitPoints(el.id, points);
        } else if (e.altKey && e.key === "Backspace" && el.points.length > 2) {
          e.preventDefault();
          commitPoints(el.id, el.points.slice(0, -1));
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPointsId, croppingId, elements]);

  // Initialize the crop rect to the full source image the first time an
  // image is cropped, and remember the pre-edit crop so Escape can revert.
  useEffect(() => {
    if (!croppingId) return;
    const img = elements.find((e) => e.id === croppingId) as ImageElement | undefined;
    cropEntrySnapshotRef.current = img?.crop ?? null;
    if (img && !img.crop) {
      const cached = getCachedImage(img.fileId);
      const width = cached?.naturalWidth || img.width;
      const height = cached?.naturalHeight || img.height;
      updateElement(img.id, { crop: { x: 0, y: 0, width, height } } as Partial<WhiteboardElement>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppingId]);

  function distToSegmentScreen(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function applyPoints(elementId: string, points: Point[]) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    updateElement(elementId, { points, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } as Partial<WhiteboardElement>);
  }
  function commitPoints(elementId: string, points: Point[]) {
    applyPoints(elementId, points);
    commitHistory();
  }

  function handlePointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore: capture is best-effort (e.g. synthetic events, some touch browsers)
    }

    if (e.pointerType === "touch") {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touchesRef.current.size === 2) {
        // A second finger just landed — abandon whatever the first finger's
        // single-pointer gesture was doing (e.g. discard an in-progress,
        // not-yet-committed shape) and switch to pinch-zoom/two-finger pan.
        const inProgress = dragRef.current;
        if (inProgress.kind === "drawing") {
          const el = useStore.getState().elements.find((x) => x.id === inProgress.elementId);
          if (el && el.width < 3 && el.height < 3) deleteElements([el.id]);
        }
        const pts = Array.from(touchesRef.current.values());
        const startDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        dragRef.current = {
          kind: "pinching",
          startDistance,
          startZoom: appState.zoom,
          startScrollX: appState.scrollX,
          startScrollY: appState.scrollY,
          startMidX: (pts[0].x + pts[1].x) / 2,
          startMidY: (pts[0].y + pts[1].y) / 2,
        };
        return;
      }
      if (touchesRef.current.size > 2) return; // ignore a 3rd+ finger
    }

    const world = toWorld(e.clientX, e.clientY);
    const isPan = appState.tool === "hand" || spaceHeld.current || e.button === 1;

    if (isPan) {
      dragRef.current = { kind: "panning", startX: e.clientX, startY: e.clientY, startScrollX: appState.scrollX, startScrollY: appState.scrollY };
      return;
    }

    if (dragRef.current.kind === "multipoint") {
      const chain = dragRef.current;
      const el = elements.find((x) => x.id === chain.elementId) as LineElement | ArrowElement | undefined;
      if (!el) {
        dragRef.current = { kind: "none" };
      } else {
        const last = el.points[el.points.length - 1];
        const lastWorld = { x: el.x + last.x, y: el.y + last.y };
        const distPx = Math.hypot((world.x - lastWorld.x) * appState.zoom, (world.y - lastWorld.y) * appState.zoom);
        if (distPx < 6 && el.points.length >= 2) {
          finishMultipoint(el.id);
        } else {
          applyPoints(el.id, [...el.points, { x: world.x - el.x, y: world.y - el.y }]);
        }
      }
      return;
    }

    if (croppingId && appState.tool === "selection") {
      const img = elements.find((x) => x.id === croppingId) as ImageElement | undefined;
      const rect = canvasRef.current!.getBoundingClientRect();
      const screenClick = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (img) {
        const crop = img.crop ?? { x: 0, y: 0, width: img.width, height: img.height };
        const startBounds = { x: img.x, y: img.y, width: img.width, height: img.height };
        const cropWorld = { x1: img.x, y1: img.y, x2: img.x + img.width, y2: img.y + img.height };
        const handles = getResizeHandles(cropWorld);
        for (const [pos, pt] of Object.entries(handles) as [HandlePosition, Point][]) {
          if (pos === "rotate") continue;
          const screenPt = { x: pt.x * appState.zoom + appState.scrollX, y: pt.y * appState.zoom + appState.scrollY };
          if (Math.hypot(screenPt.x - screenClick.x, screenPt.y - screenClick.y) < 10) {
            dragRef.current = { kind: "cropping", elementId: img.id, handle: pos, startX: world.x, startY: world.y, startCrop: crop, startBounds };
            return;
          }
        }
        if (world.x >= img.x && world.x <= img.x + img.width && world.y >= img.y && world.y <= img.y + img.height) {
          dragRef.current = { kind: "cropping", elementId: img.id, handle: "move", startX: world.x, startY: world.y, startCrop: crop, startBounds };
          return;
        }
      }
      setCroppingId(null);
    }

    if (editingPointsId && appState.tool === "selection") {
      const el = elements.find((x) => x.id === editingPointsId) as LineElement | ArrowElement | undefined;
      const rect = canvasRef.current!.getBoundingClientRect();
      const screenClick = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (el) {
        const pts = el.points.map((p) => ({ x: p.x + el.x, y: p.y + el.y }));
        for (let i = 0; i < pts.length; i++) {
          const s = { x: pts[i].x * appState.zoom + appState.scrollX, y: pts[i].y * appState.zoom + appState.scrollY };
          if (Math.hypot(s.x - screenClick.x, s.y - screenClick.y) < POINT_HIT_RADIUS) {
            if (e.altKey && el.points.length > 2) {
              commitPoints(el.id, el.points.filter((_, idx) => idx !== i));
              return;
            }
            dragRef.current = { kind: "editingPoint", elementId: el.id, pointIndex: i };
            return;
          }
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const s1 = { x: pts[i].x * appState.zoom + appState.scrollX, y: pts[i].y * appState.zoom + appState.scrollY };
          const s2 = { x: pts[i + 1].x * appState.zoom + appState.scrollX, y: pts[i + 1].y * appState.zoom + appState.scrollY };
          if (distToSegmentScreen(screenClick, s1, s2) < POINT_HIT_RADIUS) {
            const newPoints = [...el.points];
            newPoints.splice(i + 1, 0, { x: world.x - el.x, y: world.y - el.y });
            commitPoints(el.id, newPoints);
            dragRef.current = { kind: "editingPoint", elementId: el.id, pointIndex: i + 1 };
            return;
          }
        }
      }
      setEditingPointsId(null);
    }

    if (appState.tool === "eraser") {
      dragRef.current = { kind: "erasing" };
      const hit = topElementAt(world.x, world.y);
      if (hit) deleteElements([hit.id]);
      return;
    }

    if (appState.tool === "lasso") {
      if (!e.shiftKey) setSelectedIds([]);
      dragRef.current = { kind: "lassoing", points: [world] };
      return;
    }

    if (appState.tool === "selection") {
      // resize/rotate handle hit test
      if (combinedBounds) {
        const handles = getResizeHandles(combinedBounds);
        for (const [pos, pt] of Object.entries(handles) as [HandlePosition, Point][]) {
          const screenPt = { x: pt.x * appState.zoom + appState.scrollX, y: pt.y * appState.zoom + appState.scrollY };
          const screenClick = { x: e.clientX - canvasRef.current!.getBoundingClientRect().left, y: e.clientY - canvasRef.current!.getBoundingClientRect().top };
          if (Math.hypot(screenPt.x - screenClick.x, screenPt.y - screenClick.y) < 10) {
            if (pos === "rotate") {
              const cx = (combinedBounds.x1 + combinedBounds.x2) / 2;
              const cy = (combinedBounds.y1 + combinedBounds.y2) / 2;
              const origin = new Map(selectedElements.map((el) => [el.id, el.angle]));
              dragRef.current = { kind: "rotating", centerX: cx, centerY: cy, startAngle: Math.atan2(world.y - cy, world.x - cx), origin };
            } else {
              const origin = new Map(selectedElements.map((el) => [el.id, el]));
              dragRef.current = { kind: "resizing", handle: pos, startX: world.x, startY: world.y, startBounds: combinedBounds, origin };
            }
            return;
          }
        }
      }

      const hit = topElementAt(world.x, world.y);
      if (hit && hit.link && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd-click a linked element to open it — a plain click still
        // selects/moves as normal, so the link never intercepts ordinary editing.
        window.open(hit.link, "_blank", "noopener,noreferrer");
        return;
      }
      if (hit) {
        let newSelection = appState.selectedIds;
        if (e.shiftKey) {
          newSelection = appState.selectedIds.includes(hit.id) ? appState.selectedIds.filter((id) => id !== hit.id) : [...appState.selectedIds, hit.id];
        } else if (!appState.selectedIds.includes(hit.id)) {
          newSelection = [hit.id];
        }
        setSelectedIds(newSelection);
        const targets = elements.filter((el) => newSelection.includes(el.id));
        const origin = new Map(targets.map((el) => [el.id, { x: el.x, y: el.y }]));
        dragRef.current = { kind: "moving", startX: world.x, startY: world.y, origin };
      } else {
        if (!e.shiftKey) setSelectedIds([]);
        dragRef.current = { kind: "selecting", startX: world.x, startY: world.y, endX: world.x, endY: world.y };
      }
      return;
    }

    if (appState.tool === "text") {
      const el = createElement(appState, "text", world.x, world.y, elements.length) as TextElement;
      addElement(el);
      setAppState({ editingTextId: el.id });
      setTool("selection");
      return;
    }

    if (appState.tool === "embed") {
      const url = prompt(
        "Paste a URL to embed (YouTube, Vimeo, Figma, CodeSandbox, CodePen, Google Docs/Maps, Loom, Spotify, GitHub Gist, Notion, or Observable):"
      );
      setTool("selection");
      if (!url) return;
      if (!isEmbeddableUrl(url)) {
        alert("That URL isn't on the allowed list of embeddable sites — for security, DrawBoard only embeds a curated set of known services.");
        return;
      }
      const el = createEmbedElement(appState, world.x, world.y, elements.length, url);
      addElement(el);
      setSelectedIds([el.id]);
      commitHistory();
      return;
    }

    const el = createElement(appState, appState.tool, world.x, world.y, elements.length);
    if (!el) return;
    if (el.type === "arrow") {
      const startShape = findBindableShapeAt(elements, world.x, world.y);
      if (startShape) (el as ArrowElement).startBinding = { elementId: startShape.id, focus: 0, gap: 4 };
    }
    addElement(el);
    setSelectedIds([el.id]);
    dragRef.current = { kind: "drawing", elementId: el.id, startX: world.x, startY: world.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;

    if (e.pointerType === "touch" && touchesRef.current.has(e.pointerId)) {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (drag.kind === "pinching") {
      const pts = Array.from(touchesRef.current.values());
      if (pts.length < 2) return;
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const newZoom = Math.min(30, Math.max(0.1, drag.startZoom * (distance / drag.startDistance)));
      const rect = canvasRef.current!.getBoundingClientRect();
      // The world point that was under the fingers' starting midpoint should
      // stay under their current midpoint — that single constraint gives both
      // zoom-around-pinch-center and two-finger pan at once.
      const anchorWorldX = (drag.startMidX - rect.left - drag.startScrollX) / drag.startZoom;
      const anchorWorldY = (drag.startMidY - rect.top - drag.startScrollY) / drag.startZoom;
      setAppState({
        zoom: newZoom,
        scrollX: midX - rect.left - anchorWorldX * newZoom,
        scrollY: midY - rect.top - anchorWorldY * newZoom,
      });
      return;
    }

    if (drag.kind === "none") return;
    const world = toWorld(e.clientX, e.clientY);

    if (drag.kind === "panning") {
      setAppState({ scrollX: drag.startScrollX + (e.clientX - drag.startX), scrollY: drag.startScrollY + (e.clientY - drag.startY) });
      return;
    }

    if (drag.kind === "erasing") {
      const hit = topElementAt(world.x, world.y);
      if (hit) deleteElements([hit.id]);
      return;
    }

    if (drag.kind === "drawing") {
      const el = useStore.getState().elements.find((x) => x.id === drag.elementId);
      if (!el) return;
      if (el.type === "line" || el.type === "arrow" || el.type === "draw") {
        const points = el.type === "draw" ? [...(el as DrawElement).points, { x: world.x - el.x, y: world.y - el.y }] : [{ x: 0, y: 0 }, { x: world.x - drag.startX, y: world.y - drag.startY }];
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        updateElement(el.id, { points, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) } as Partial<WhiteboardElement>);
      } else {
        const x = Math.min(drag.startX, world.x);
        const y = Math.min(drag.startY, world.y);
        const width = Math.abs(world.x - drag.startX);
        const height = Math.abs(world.y - drag.startY);
        updateElement(el.id, { x, y, width, height });
      }
      return;
    }

    if (drag.kind === "moving") {
      const dx = world.x - drag.startX;
      const dy = world.y - drag.startY;
      drag.origin.forEach((pos, id) => {
        updateElement(id, { x: pos.x + dx, y: pos.y + dy });
      });
      syncBoundArrows(Array.from(drag.origin.keys()));
      syncBoundText(Array.from(drag.origin.keys()));
      return;
    }

    if (drag.kind === "resizing") {
      applyResize(drag, world);
      syncBoundArrows(Array.from(drag.origin.keys()));
      syncBoundText(Array.from(drag.origin.keys()));
      return;
    }

    if (drag.kind === "rotating") {
      const angleNow = Math.atan2(world.y - drag.centerY, world.x - drag.centerX);
      const delta = angleNow - drag.startAngle;
      drag.origin.forEach((startAngle, id) => {
        updateElement(id, { angle: startAngle + delta });
      });
      return;
    }

    if (drag.kind === "selecting") {
      dragRef.current = { ...drag, endX: world.x, endY: world.y };
      const ids = elements.filter((el) => isElementInRect(el, drag.startX, drag.startY, world.x, world.y)).map((el) => el.id);
      setSelectedIds(ids);
      forceRender((n) => n + 1);
      return;
    }

    if (drag.kind === "lassoing") {
      const points = [...drag.points, world];
      dragRef.current = { kind: "lassoing", points };
      const ids = elements.filter((el) => isElementInPolygon(el, points)).map((el) => el.id);
      setSelectedIds(ids);
      forceRender((n) => n + 1);
      return;
    }

    if (drag.kind === "multipoint") {
      multipointCursorRef.current = world;
      forceRender((n) => n + 1);
      return;
    }

    if (drag.kind === "editingPoint") {
      const el = elements.find((x) => x.id === drag.elementId) as LineElement | ArrowElement | undefined;
      if (!el) return;
      const points = [...el.points];
      points[drag.pointIndex] = { x: world.x - el.x, y: world.y - el.y };
      applyPoints(el.id, points);
      // Manually repositioning a bound endpoint means the user is deliberately
      // detaching it — otherwise syncBoundArrows would just snap it straight back.
      if (el.type === "arrow") {
        const a = el as ArrowElement;
        if (drag.pointIndex === 0 && a.startBinding) updateElement(a.id, { startBinding: null } as Partial<WhiteboardElement>);
        if (drag.pointIndex === points.length - 1 && a.endBinding) updateElement(a.id, { endBinding: null } as Partial<WhiteboardElement>);
      }
      return;
    }

    if (drag.kind === "cropping") {
      applyCrop(drag, world);
      return;
    }
  }

  function applyCrop(drag: Extract<DragMode, { kind: "cropping" }>, world: Point) {
    const img = elements.find((x) => x.id === drag.elementId) as ImageElement | undefined;
    if (!img) return;
    const cached = getCachedImage(img.fileId);
    const naturalW = cached?.naturalWidth || drag.startCrop.x + drag.startCrop.width;
    const naturalH = cached?.naturalHeight || drag.startCrop.y + drag.startCrop.height;
    const scaleX = drag.startBounds.width / drag.startCrop.width;
    const scaleY = drag.startBounds.height / drag.startCrop.height;
    const MIN_CROP = 10;

    if (drag.handle === "move") {
      // Pan which part of the source image shows through a fixed-size window —
      // the displayed box (img.x/y/width/height) doesn't move, only `crop` does.
      const dx = (world.x - drag.startX) / scaleX;
      const dy = (world.y - drag.startY) / scaleY;
      const crop: ImageCrop = {
        x: Math.max(0, Math.min(naturalW - drag.startCrop.width, drag.startCrop.x - dx)),
        y: Math.max(0, Math.min(naturalH - drag.startCrop.height, drag.startCrop.y - dy)),
        width: drag.startCrop.width,
        height: drag.startCrop.height,
      };
      updateElement(img.id, { crop } as Partial<WhiteboardElement>);
      return;
    }

    // Dragging an edge/corner trims that side — the box shrinks in lockstep
    // with the crop rect so the remaining content doesn't re-stretch.
    let { x: cropX, y: cropY, width: cropW, height: cropH } = drag.startCrop;
    let { x: boxX, y: boxY, width: boxW, height: boxH } = drag.startBounds;
    const dxWorld = world.x - drag.startX;
    const dyWorld = world.y - drag.startY;

    if (drag.handle.includes("e")) {
      const trimmed = Math.max(MIN_CROP - cropW, Math.min(naturalW - cropX - cropW, dxWorld / scaleX));
      cropW = drag.startCrop.width + trimmed;
      boxW = drag.startBounds.width + trimmed * scaleX;
    }
    if (drag.handle.includes("s")) {
      const trimmed = Math.max(MIN_CROP - cropH, Math.min(naturalH - cropY - cropH, dyWorld / scaleY));
      cropH = drag.startCrop.height + trimmed;
      boxH = drag.startBounds.height + trimmed * scaleY;
    }
    if (drag.handle.includes("w")) {
      const trimmed = Math.max(-cropX, Math.min(drag.startCrop.width - MIN_CROP, dxWorld / scaleX));
      cropX = drag.startCrop.x + trimmed;
      cropW = drag.startCrop.width - trimmed;
      boxX = drag.startBounds.x + trimmed * scaleX;
      boxW = drag.startBounds.width - trimmed * scaleX;
    }
    if (drag.handle.includes("n")) {
      const trimmed = Math.max(-cropY, Math.min(drag.startCrop.height - MIN_CROP, dyWorld / scaleY));
      cropY = drag.startCrop.y + trimmed;
      cropH = drag.startCrop.height - trimmed;
      boxY = drag.startBounds.y + trimmed * scaleY;
      boxH = drag.startBounds.height - trimmed * scaleY;
    }

    updateElement(img.id, {
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      crop: { x: cropX, y: cropY, width: cropW, height: cropH },
    } as Partial<WhiteboardElement>);
  }

  function applyResize(drag: Extract<DragMode, { kind: "resizing" }>, world: Point) {
    const { handle, startBounds, origin } = drag;
    let { x1, y1, x2, y2 } = startBounds;
    if (handle.includes("e")) x2 = world.x;
    if (handle.includes("w")) x1 = world.x;
    if (handle.includes("s")) y2 = world.y;
    if (handle.includes("n")) y1 = world.y;
    // Clamp to a minimum size — dragging a handle past the opposite edge would
    // otherwise produce negative width/height, corrupting bounds/hit-testing
    // for every element in the selection.
    const MIN_SIZE = 1;
    if (handle.includes("e")) x2 = Math.max(x2, x1 + MIN_SIZE);
    if (handle.includes("w")) x1 = Math.min(x1, x2 - MIN_SIZE);
    if (handle.includes("s")) y2 = Math.max(y2, y1 + MIN_SIZE);
    if (handle.includes("n")) y1 = Math.min(y1, y2 - MIN_SIZE);
    const newW = x2 - x1;
    const newH = y2 - y1;
    const oldW = startBounds.x2 - startBounds.x1 || 1;
    const oldH = startBounds.y2 - startBounds.y1 || 1;
    const scaleX = newW / oldW;
    const scaleY = newH / oldH;

    origin.forEach((el, id) => {
      const relX = el.x - startBounds.x1;
      const relY = el.y - startBounds.y1;
      const newX = x1 + relX * scaleX;
      const newY = y1 + relY * scaleY;
      const newWidth = el.width * scaleX;
      const newHeight = el.height * scaleY;
      if ("points" in el) {
        const pts = (el as LineElement | ArrowElement | DrawElement).points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }));
        updateElement(id, { x: newX, y: newY, width: newWidth, height: newHeight, points: pts } as Partial<WhiteboardElement>);
      } else {
        updateElement(id, { x: newX, y: newY, width: newWidth, height: newHeight });
      }
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch") {
      touchesRef.current.delete(e.pointerId);
      if (dragRef.current.kind === "pinching") {
        if (touchesRef.current.size >= 2) return; // another finger still down mid-pinch
        dragRef.current = { kind: "none" };
        return;
      }
    }
    const drag = dragRef.current;
    if (drag.kind === "drawing") {
      const el = useStore.getState().elements.find((x) => x.id === drag.elementId);
      const wasClick = el && el.width < 3 && el.height < 3;
      if (wasClick && el && (el.type === "line" || (el.type === "arrow" && !(el as ArrowElement).elbowed))) {
        // A plain click (no drag) with the line/arrow tool starts a
        // click-chain: click to place each point, click near the last point
        // (or Enter) to finish, Escape to cancel. The 2-point drag-to-draw
        // above is unaffected — this only triggers when nothing was dragged.
        // Elbow arrows skip this: extra manual points would just get
        // discarded by the router, which would be confusing to click through.
        dragRef.current = { kind: "multipoint", elementId: el.id };
        return;
      }
      if (wasClick && el && el.type !== "draw") {
        // treat as click-to-default-size
        updateElement(el.id, { width: 100, height: 100 });
      }
      if (el && el.type === "arrow") finalizeArrowBinding(el.id);
      setTool(appState.tool === "draw" ? "draw" : "selection");
      commitHistory();
    } else if (drag.kind === "moving" || drag.kind === "resizing" || drag.kind === "rotating" || drag.kind === "editingPoint" || drag.kind === "cropping") {
      commitHistory();
    } else if (drag.kind === "selecting") {
      forceRender((n) => n + 1);
    } else if (drag.kind === "lassoing") {
      setTool("selection");
      forceRender((n) => n + 1);
    }
    if (dragRef.current.kind !== "multipoint") dragRef.current = { kind: "none" };
  }

  function handleWheel(e: React.WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoomFactor = Math.exp(-e.deltaY * 0.002);
      const newZoom = Math.min(30, Math.max(0.1, appState.zoom * zoomFactor));
      const worldX = (mx - appState.scrollX) / appState.zoom;
      const worldY = (my - appState.scrollY) / appState.zoom;
      setAppState({
        zoom: newZoom,
        scrollX: mx - worldX * newZoom,
        scrollY: my - worldY * newZoom,
      });
    } else {
      setAppState({ scrollX: appState.scrollX - e.deltaX, scrollY: appState.scrollY - e.deltaY });
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    if (dragRef.current.kind === "multipoint") {
      finishMultipoint(dragRef.current.elementId);
      return;
    }
    const world = toWorld(e.clientX, e.clientY);
    const hit = topElementAt(world.x, world.y);
    if (hit && hit.type === "text") {
      setAppState({ editingTextId: hit.id, tool: "selection" });
    } else if (hit && (hit.type === "rectangle" || hit.type === "diamond" || hit.type === "ellipse")) {
      const layout = layoutBoundText(hit, "", appState.currentFontSize, appState.currentFontFamily);
      const el = createElement(appState, "text", layout.x, layout.y, elements.length) as TextElement;
      el.width = layout.width;
      el.height = layout.height;
      el.containerId = hit.id;
      el.textAlign = "center";
      addElement(el);
      setAppState({ editingTextId: el.id });
    } else if (
      hit &&
      appState.tool === "selection" &&
      (hit.type === "line" || (hit.type === "arrow" && !(hit as ArrowElement).elbowed))
    ) {
      // Elbow arrows route automatically from their anchor points — there
      // are no manual bend points to edit, so point-edit mode is skipped;
      // reshaping one means moving its endpoints or the shapes it's bound to.
      setSelectedIds([hit.id]);
      setEditingPointsId(hit.id);
    } else if (hit && appState.tool === "selection" && hit.type === "embed") {
      // Enter "interact" mode so the iframe becomes clickable (see
      // EmbedOverlay) — otherwise it stays inert so normal canvas
      // selection/move/resize can hit-test it like any other element.
      setSelectedIds([hit.id]);
      setInteractingEmbedId(hit.id);
    }
  }

  // remote cursor broadcast — the collab client loads lazily (only once the
  // user clicks Share), so this may need to attach after this component has
  // already mounted.
  const [collabConnected, setCollabConnected] = useState(() => Boolean(getProvider()));
  useEffect(() => {
    if (collabConnected) return;
    return onCollabConnected(() => setCollabConnected(true));
  }, [collabConnected]);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    const onMove = (e: PointerEvent) => {
      const world = toWorld(e.clientX, e.clientY);
      provider.awareness.setLocalStateField("cursor", { x: world.x, y: world.y });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [toWorld, collabConnected]);

  const drag = dragRef.current;
  const cursorStyle = appState.tool === "hand" || spaceHeld.current ? "grab" : appState.tool === "selection" ? "default" : "crosshair";

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block", cursor: cursorStyle, touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {combinedBounds && appState.tool === "selection" && !appState.editingTextId && !editingPointsId && !croppingId && (
        <SelectionOverlay bounds={combinedBounds} scrollX={appState.scrollX} scrollY={appState.scrollY} zoom={appState.zoom} />
      )}
      {drag.kind === "selecting" && (
        <div
          style={{
            position: "absolute",
            left: Math.min(drag.startX, drag.endX) * appState.zoom + appState.scrollX,
            top: Math.min(drag.startY, drag.endY) * appState.zoom + appState.scrollY,
            width: Math.abs(drag.endX - drag.startX) * appState.zoom,
            height: Math.abs(drag.endY - drag.startY) * appState.zoom,
            border: "1px solid #4dabf7",
            background: "rgba(77,171,247,0.1)",
            pointerEvents: "none",
          }}
        />
      )}
      {drag.kind === "lassoing" && (
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
          <polyline
            points={drag.points.map((p) => `${p.x * appState.zoom + appState.scrollX},${p.y * appState.zoom + appState.scrollY}`).join(" ")}
            fill="rgba(77,171,247,0.1)"
            stroke="#4dabf7"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </svg>
      )}
      {drag.kind === "multipoint" &&
        (() => {
          const el = elements.find((x) => x.id === drag.elementId) as LineElement | ArrowElement | undefined;
          if (!el) return null;
          const toScreen = (p: Point) => ({ x: (el.x + p.x) * appState.zoom + appState.scrollX, y: (el.y + p.y) * appState.zoom + appState.scrollY });
          const last = toScreen(el.points[el.points.length - 1]);
          const cursor = multipointCursorRef.current ? toScreen({ x: multipointCursorRef.current.x - el.x, y: multipointCursorRef.current.y - el.y }) : null;
          return (
            <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
              {cursor && <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y} stroke="#4dabf7" strokeWidth={1.5} strokeDasharray="4 3" />}
              {el.points.map((p, i) => {
                const s = toScreen(p);
                return <circle key={i} cx={s.x} cy={s.y} r={4} fill="#fff" stroke="#4dabf7" strokeWidth={1.5} />;
              })}
            </svg>
          );
        })()}
      {editingPointsId &&
        (() => {
          const el = elements.find((x) => x.id === editingPointsId) as LineElement | ArrowElement | undefined;
          if (!el) return null;
          return <PointEditorOverlay element={el} scrollX={appState.scrollX} scrollY={appState.scrollY} zoom={appState.zoom} />;
        })()}
      {croppingId &&
        (() => {
          const img = elements.find((x) => x.id === croppingId) as ImageElement | undefined;
          if (!img) return null;
          return <CropOverlay image={img} scrollX={appState.scrollX} scrollY={appState.scrollY} zoom={appState.zoom} />;
        })()}
      {appState.editingTextId && <TextEditorOverlay elementId={appState.editingTextId} />}
      <EmbedOverlay
        elements={elements.filter((e) => e.type === "embed") as EmbedElement[]}
        interactingId={interactingEmbedId}
        scrollX={appState.scrollX}
        scrollY={appState.scrollY}
        zoom={appState.zoom}
      />
      <CursorsOverlay scrollX={appState.scrollX} scrollY={appState.scrollY} zoom={appState.zoom} />
    </div>
  );
}
