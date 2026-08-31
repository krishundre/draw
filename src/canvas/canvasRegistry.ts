// A tiny singleton holding the live <canvas> element, so chrome components
// (toolbar, panels, etc.) that need to sample canvas pixel content for
// adaptive contrast don't need it prop-drilled through the whole tree.
// Set once by Canvas.tsx on mount.
type Listener = () => void;

let canvasEl: HTMLCanvasElement | null = null;
const listeners = new Set<Listener>();

export function setRegisteredCanvas(el: HTMLCanvasElement | null) {
  canvasEl = el;
  listeners.forEach((l) => l());
}

export function getRegisteredCanvas(): HTMLCanvasElement | null {
  return canvasEl;
}

export function onCanvasRegistered(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
