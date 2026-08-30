import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../state/store";
import { renderScene } from "./render";
import { createElement } from "./factory";
import {
  getCombinedBounds,
  getResizeHandles,
  isElementInRect,
  isPointInElement,
  type HandlePosition,
} from "./geometry";
import type { ArrowElement, DrawElement, LineElement, Point, TextElement, WhiteboardElement } from "../types";
import { TextEditorOverlay } from "../components/TextEditorOverlay";
import { SelectionOverlay } from "../components/SelectionOverlay";
import { CursorsOverlay } from "../components/CursorsOverlay";
import { getProvider, onCollabConnected } from "../collab/doc";

type DragMode =
  | { kind: "none" }
  | { kind: "drawing"; elementId: string; startX: number; startY: number }
  | { kind: "multipoint"; elementId: string }
  | { kind: "moving"; startX: number; startY: number; origin: Map<string, { x: number; y: number }> }
  | { kind: "resizing"; handle: HandlePosition; startX: number; startY: number; startBounds: { x1: number; y1: number; x2: number; y2: number }; origin: Map<string, WhiteboardElement> }
  | { kind: "rotating"; centerX: number; centerY: number; startAngle: number; origin: Map<string, number> }
  | { kind: "panning"; startX: number; startY: number; startScrollX: number; startScrollY: number }
  | { kind: "selecting"; startX: number; startY: number; endX: number; endY: number }
  | { kind: "erasing" };

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode>({ kind: "none" });
  const spaceHeld = useRef(false);
  const [, forceRender] = useState(0);

  const { elements, appState, setAppState, addElement, updateElement, deleteElements, commitHistory, setSelectedIds, setTool } = useStore();

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

  function handlePointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // ignore: capture is best-effort (e.g. synthetic events, some touch browsers)
    }
    const world = toWorld(e.clientX, e.clientY);
    const isPan = appState.tool === "hand" || spaceHeld.current || e.button === 1;

    if (isPan) {
      dragRef.current = { kind: "panning", startX: e.clientX, startY: e.clientY, startScrollX: appState.scrollX, startScrollY: appState.scrollY };
      return;
    }

    if (appState.tool === "eraser") {
      dragRef.current = { kind: "erasing" };
      const hit = topElementAt(world.x, world.y);
      if (hit) deleteElements([hit.id]);
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

    const el = createElement(appState, appState.tool, world.x, world.y, elements.length);
    if (!el) return;
    addElement(el);
    setSelectedIds([el.id]);
    dragRef.current = { kind: "drawing", elementId: el.id, startX: world.x, startY: world.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
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
      return;
    }

    if (drag.kind === "resizing") {
      applyResize(drag, world);
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
  }

  function applyResize(drag: Extract<DragMode, { kind: "resizing" }>, world: Point) {
    const { handle, startBounds, origin } = drag;
    let { x1, y1, x2, y2 } = startBounds;
    if (handle.includes("e")) x2 = world.x;
    if (handle.includes("w")) x1 = world.x;
    if (handle.includes("s")) y2 = world.y;
    if (handle.includes("n")) y1 = world.y;
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

  function handlePointerUp() {
    const drag = dragRef.current;
    if (drag.kind === "drawing") {
      const el = useStore.getState().elements.find((x) => x.id === drag.elementId);
      if (el && el.type !== "draw" && el.width < 3 && el.height < 3) {
        // treat as click-to-default-size
        updateElement(el.id, { width: 100, height: 100 });
      }
      setTool(appState.tool === "draw" ? "draw" : "selection");
      commitHistory();
    } else if (drag.kind === "moving" || drag.kind === "resizing" || drag.kind === "rotating") {
      commitHistory();
    } else if (drag.kind === "selecting") {
      forceRender((n) => n + 1);
    }
    dragRef.current = { kind: "none" };
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
    const world = toWorld(e.clientX, e.clientY);
    const hit = topElementAt(world.x, world.y);
    if (hit && hit.type === "text") {
      setAppState({ editingTextId: hit.id, tool: "selection" });
    } else if (hit && (hit.type === "rectangle" || hit.type === "diamond" || hit.type === "ellipse")) {
      const el = createElement(appState, "text", hit.x + hit.width / 2, hit.y + hit.height / 2, elements.length) as TextElement;
      el.containerId = hit.id;
      el.textAlign = "center";
      addElement(el);
      setAppState({ editingTextId: el.id });
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
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      {combinedBounds && appState.tool === "selection" && !appState.editingTextId && (
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
      {appState.editingTextId && <TextEditorOverlay elementId={appState.editingTextId} />}
      <CursorsOverlay scrollX={appState.scrollX} scrollY={appState.scrollY} zoom={appState.zoom} />
    </div>
  );
}
