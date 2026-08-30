import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
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

export function connectCollab(username: string, color: string) {
  if (provider) return provider;
  provider = new WebsocketProvider(WS_URL, roomId, ydoc, { connect: true });
  provider.awareness.setLocalStateField("user", { name: username, color });
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
