// Minimal Yjs WebSocket relay server for DrawBoard real-time collaboration.
// Each "room" (query param ?room=<id>) gets its own in-memory Y.Doc.
// Docs are not persisted server-side — each client persists its own copy
// locally via IndexedDB (see src/collab/doc.ts), so the server can be
// restarted at any time without losing anyone's work (as long as one
// client stays synced).
import { WebSocketServer } from "ws";
import http from "http";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync.js";
import * as awarenessProtocol from "y-protocols/awareness.js";
import * as encoding from "lib0/encoding.js";
import * as decoding from "lib0/decoding.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 1234;

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

class Room {
  constructor(name) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.conns = new Set();
    this.connClientIds = new Map(); // conn -> Set<clientId>

    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      const changed = added.concat(updated, removed);
      if (origin && this.connClientIds.has(origin)) {
        const set = this.connClientIds.get(origin);
        added.forEach((id) => set.add(id));
        removed.forEach((id) => set.delete(id));
      }
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed));
      this.broadcast(encoding.toUint8Array(encoder), origin);
    });

    this.doc.on("update", (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      this.broadcast(encoding.toUint8Array(encoder), origin);
    });
  }

  broadcast(message, origin) {
    this.conns.forEach((conn) => {
      if (conn !== origin && conn.readyState === conn.OPEN) conn.send(message);
    });
  }
}

const rooms = new Map();
function getRoom(name) {
  let room = rooms.get(name);
  if (!room) {
    room = new Room(name);
    rooms.set(name, room);
  }
  return room;
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("DrawBoard collab server OK\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (conn, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const roomName = url.searchParams.get("room") || url.pathname.slice(1) || "local-default-room";
  const room = getRoom(roomName);
  room.conns.add(conn);
  room.connClientIds.set(conn, new Set());
  conn.binaryType = "arraybuffer";

  // initial sync step 1
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    conn.send(encoding.toUint8Array(encoder));
  }
  // send current awareness states
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys())));
    conn.send(encoding.toUint8Array(encoder));
  }

  conn.on("message", (data) => {
    const message = new Uint8Array(data);
    const decoder = decoding.createDecoder(message);
    const encoder = encoding.createEncoder();
    const type = decoding.readVarUint(decoder);
    switch (type) {
      case MESSAGE_SYNC:
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
        if (encoding.length(encoder) > 1) conn.send(encoding.toUint8Array(encoder));
        break;
      case MESSAGE_AWARENESS:
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), conn);
        break;
    }
  });

  conn.on("close", () => {
    room.conns.delete(conn);
    const clientIds = room.connClientIds.get(conn);
    room.connClientIds.delete(conn);
    if (clientIds && clientIds.size) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(clientIds), null);
    }
    if (room.conns.size === 0) rooms.delete(roomName);
  });
});

server.listen(PORT, () => {
  console.log(`DrawBoard collab server listening on ws://localhost:${PORT}`);
});
