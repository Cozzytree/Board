import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// ── Message types (matching y-websocket protocol) ──
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// ── Per-room state ──
type RoomState = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<Bun.ServerWebSocket<WSData>, Set<number>>;
  cleanupTimeout: ReturnType<typeof setTimeout> | null;
};

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (room) {
    // Clear any pending cleanup if room already exists
    if (room.cleanupTimeout) {
      clearTimeout(room.cleanupTimeout);
      room.cleanupTimeout = null;
    }
    return room;
  }

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  awareness.on(
    "update",
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      _origin: unknown,
    ) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoderAwareness = encoding.createEncoder();
      encoding.writeVarUint(encoderAwareness, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoderAwareness,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const buf = encoding.toUint8Array(encoderAwareness);

      room!.conns.forEach((_, ws) => {
        try {
          ws.send(buf);
        } catch {
          /* ignore closed */
        }
      });
    },
  );

  room = { doc, awareness, conns: new Map(), cleanupTimeout: null };
  rooms.set(roomId, room);
  console.log(`[room] created: ${roomId}`);
  return room;
}

function handleMessage(ws: Bun.ServerWebSocket<WSData>, room: RoomState, data: Uint8Array) {
  const decoder = decoding.createDecoder(data);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MSG_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);

      // Send response if there's content (SyncStep1 reply, etc.)
      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder));
      }
      break;
    }
    case MSG_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        room.awareness,
        decoding.readVarUint8Array(decoder),
        ws,
      );
      break;
    }
  }
}

function setupConnection(ws: Bun.ServerWebSocket<WSData>, room: RoomState) {
  room.conns.set(ws, new Set());
  console.log(`[room] ${roomIdFromWs(ws)}: connection added, total: ${room.conns.size}`);

  // Listen for doc updates and broadcast to all OTHER clients
  const onUpdate = (update: Uint8Array, origin: unknown) => {
    // Don't send back to origin - y-websocket handles that
    if (origin === ws) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const buf = encoding.toUint8Array(encoder);

    // Broadcast to all OTHER connected clients
    room.conns.forEach((_, clientWs) => {
      if (clientWs !== origin) {
        try {
          clientWs.send(buf);
        } catch {
          /* ignore closed */
        }
      }
    });
  };
  room.doc.on("update", onUpdate);

  // Return cleanup function
  return () => {
    room.doc.off("update", onUpdate);

    const controlledIds = room.conns.get(ws);
    room.conns.delete(ws);
    console.log(`[room] ${roomIdFromWs(ws)}: connection removed, remaining: ${room.conns.size}`);

    if (controlledIds) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null);
    }

    // Delayed cleanup - wait before destroying empty rooms
    if (room.conns.size === 0) {
      if (room.cleanupTimeout) {
        clearTimeout(room.cleanupTimeout);
      }
      room.cleanupTimeout = setTimeout(() => {
        if (room.conns.size === 0) {
          const roomId = [...rooms.entries()].find(([, r]) => r === room)?.[0];
          if (roomId) {
            console.log(`[room] destroyed: ${roomId}`);
            room.awareness.destroy();
            room.doc.destroy();
            rooms.delete(roomId);
          }
        }
      }, 10000); // 10 second grace period
    }
  };
}

function roomIdFromWs(ws: Bun.ServerWebSocket<WSData>): string {
  return ws.data?.roomId || "unknown";
}

// ── Bun Server ──
type WSData = {
  roomId: string;
  cleanup?: () => void;
};

const server = Bun.serve<WSData>({
  port: 3000,
  websocket: {
    message(ws, message) {
      const room = rooms.get(ws.data.roomId);
      if (!room) return;

      const data =
        message instanceof ArrayBuffer
          ? new Uint8Array(message)
          : typeof message === "string"
            ? new TextEncoder().encode(message)
            : new Uint8Array(message);

      handleMessage(ws, room, data);
    },

    open(ws) {
      const room = getOrCreateRoom(ws.data.roomId);
      ws.data.cleanup = setupConnection(ws, room);
      console.log(
        `[ws] client connected to room: ${ws.data.roomId}, total clients: ${room.conns.size}`,
      );
    },

    close(ws) {
      ws.data.cleanup?.();
      console.log(`[ws] client disconnected from room: ${ws.data.roomId}`);
    },
  },
  fetch(req, server) {
    const url = new URL(req.url);
    const roomId = url.pathname.slice(1);

    if (!roomId) {
      return new Response("Board WebSocket server. Connect to /:roomId", {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const success = server.upgrade(req, {
      data: { roomId },
    });

    if (success) return undefined as unknown as Response;

    return new Response("WebSocket upgrade failed", {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  },
});

console.log(`[board-ws] Yjs WebSocket server running on port ${server.port}`);

// opencode -s ses_274600b45ffe3GOrEedH8l4cIj
