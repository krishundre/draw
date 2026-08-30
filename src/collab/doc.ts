import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import type { WebsocketProvider } from "y-websocket";
import type { WhiteboardElement } from "../types";

function getRoomFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") ?? "local-default-room";
}

export const roomId = getRoomFromUrl();

export const ydoc = new Y.Doc();
export const yElements = ydoc.getMap<WhiteboardElement>("elements");
export const yMeta = ydoc.getMap<string>("meta");

export const persistence = new IndexeddbPersistence(`drawboard-${roomId}`, ydoc);
export const persistenceReady = persistence.whenSynced;

const WS_URL = (import.meta.env.VITE_COLLAB_WS_URL as string | undefined) ?? "ws://localhost:1234";

let provider: WebsocketProvider | null = null;

// y-websocket (the collaboration client) is only needed by the small minority
// of visitors who actually click "Share" — it's dynamically imported here
// instead of at module load, so everyone else doesn't pay for it. Listeners
// (Canvas's cursor broadcast, CursorsOverlay) subscribe to this to react once
// the provider becomes available, since they may already be mounted by then.
const collabEvents = new EventTarget();

export function onCollabConnected(cb: () => void): () => void {
  collabEvents.addEventListener("connected", cb);
  return () => collabEvents.removeEventListener("connected", cb);
}

export async function connectCollab(username: string, color: string) {
  if (provider) return provider;
  const { WebsocketProvider } = await import("y-websocket");
  if (provider) return provider; // guard against a concurrent call finishing first
  provider = new WebsocketProvider(WS_URL, roomId, ydoc, { connect: true });
  provider.awareness.setLocalStateField("user", { name: username, color });
  collabEvents.dispatchEvent(new Event("connected"));
  return provider;
}

export function disconnectCollab() {
  provider?.disconnect();
}

export function getProvider() {
  return provider;
}

export function getShareUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomId);
  return url.toString();
}
