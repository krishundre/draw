import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { getRegisteredCanvas, onCanvasRegistered } from "../canvas/canvasRegistry";
import { sampleBackgroundReading, type BackgroundReading } from "./adaptiveContrast";

const SETTLE_DELAY_MS = 220;

// Returns "light" | "dark" describing what's on the canvas directly behind
// the given element right now, re-sampled whenever the view settles after a
// pan/zoom/draw — not continuously. Real-time (every-frame) sampling would
// mean a getImageData readback (a GPU->CPU sync point) on every animation
// frame for every glass panel, which is the kind of thing that visibly tanks
// interaction responsiveness during a drag; debouncing to "stopped changing
// for ~200ms" gets the same practical result (the chrome adapts as soon as
// you stop moving) for a small fraction of the cost.
export function useAdaptiveContrast<T extends HTMLElement>(active: boolean = true) {
  const ref = useRef<T | null>(null);
  const [reading, setReading] = useState<BackgroundReading | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const scrollX = useStore((s) => s.appState.scrollX);
  const scrollY = useStore((s) => s.appState.scrollY);
  const zoom = useStore((s) => s.appState.zoom);
  const elements = useStore((s) => s.elements);
  const theme = useStore((s) => s.appState.theme);
  const canvasBackground = useStore((s) => s.appState.canvasBackground);
  // Skip while the tutorial is up — it's the exact window (first paint of a
  // first-ever visit) where piling every panel's getImageData readback on
  // top of the tutorial's own initial render is most likely to show up as
  // main-thread blocking time, and the scrim/spotlight already dominate the
  // screen so the extra precision isn't worth it yet.
  const tutorialOpen = useStore((s) => s.appState.tutorialOpen);

  useEffect(() => {
    if (!active || tutorialOpen) return;

    function sampleNow() {
      const el = ref.current;
      const canvas = getRegisteredCanvas();
      if (!el || !canvas) return;
      const next = sampleBackgroundReading(canvas, el.getBoundingClientRect());
      if (next) setReading(next);
    }

    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(sampleNow, SETTLE_DELAY_MS);

    // In case this panel mounted before the canvas registered itself.
    const unsub = onCanvasRegistered(sampleNow);

    return () => {
      window.clearTimeout(timerRef.current);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tutorialOpen, scrollX, scrollY, zoom, elements, theme, canvasBackground]);

  return { ref, background: reading };
}
