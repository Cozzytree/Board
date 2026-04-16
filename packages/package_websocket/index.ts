import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { auth } from "./auth";
import { initPageHandler } from "./handlers/pages.handler";
import { initShapeHandler } from "./handlers/shapes.handler";
import { initSessionHandler } from "./handlers/sessions.handler";
import { createRepos } from "./repo";
import { db } from "./db";

// ── Message types (matching y-websocket protocol) ──
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// ── Per-room state ──
type RoomState = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<Bun.ServerWebSocket<WSData>, Set<number>>;
  cleanupTimeout: ReturnType<typeof setTimeout> | null;
  sessionId?: string;
  sessionKey?: string;
};

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string, sessionId?: string, sessionKey?: string): RoomState {
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
      console.log(`[awareness] broadcast to ${room!.conns.size} clients, changed:`, changedClients);
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

  room = { doc, awareness, conns: new Map(), cleanupTimeout: null, sessionId, sessionKey };
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
      const update = decoding.readVarUint8Array(decoder);
      console.log(`[room] ${roomIdFromWs(ws)}: received awareness update, size: ${update.length}`);
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
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
      room.cleanupTimeout = setTimeout(async () => {
        if (room.conns.size === 0) {
          const roomId = [...rooms.entries()].find(([, r]) => r === room)?.[0];
          if (roomId) {
            if (room.sessionId) {
              try {
                console.log(`[session] syncing shapes to DB for session: ${room.sessionId}`);
                const session = await repos.sessions.findById(room.sessionId);
                if (session) {
                  const yShapes = room.doc.getMap<string>("shapes");
                  let syncedCount = 0;
                  let deletedCount = 0;

                  yShapes.forEach((raw, shapeId) => {
                    try {
                      const obj = JSON.parse(raw);
                      if (obj === null || obj === undefined || obj._deleted) {
                        repos.shapes.hardDelete(shapeId);
                        deletedCount++;
                      } else {
                        repos.shapes.upsert(shapeId, {
                          pageId: session.pageId,
                          props: obj,
                          sessionId: room.sessionId,
                          updatedBy: session.ownerId,
                        });
                        syncedCount++;
                      }
                    } catch (e) {
                      console.error(`[session] failed to parse shape ${shapeId}:`, e);
                    }
                  });

                  console.log(
                    `[session] synced ${syncedCount} shapes, deleted ${deletedCount} shapes`,
                  );

                  if (session.isActive) {
                    await repos.pages.update(session.pageId, { isLocked: false });
                  }
                  await repos.sessions.delete(room.sessionId);
                  console.log(`[session] deleted: ${room.sessionId}`);
                }
              } catch (err) {
                console.error(`[session] failed to sync/delete session:`, err);
              }
            }
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
  sessionId?: string;
  sessionKey?: string;
  isOwner?: boolean;
  userId?: string;
};

const repos = createRepos(db);
const pageHandler = initPageHandler(repos, auth);
const shapeHandler = initShapeHandler(repos, auth);
const sessionHandler = initSessionHandler(repos, auth);

const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:4173"];

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "http://localhost:5173",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  });
}

async function authHandlerWrapper(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  const response = await auth.handler(req);
  const cors = corsHeaders();
  const newHeaders = new Headers(response.headers);
  cors.forEach((value, key) => {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value);
    }
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function withCors(handler: (req: Bun.BunRequest) => Promise<Response>) {
  return async (req: Bun.BunRequest): Promise<Response> => {
    const response = await handler(req);

    const cors = corsHeaders();
    const headers = new Headers(response.headers);

    cors.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    // Avoid double compression
    if (headers.has("Content-Encoding")) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const body = response.body ? await response.body.bytes() : null;
    if (!body || body.length < 1024) {
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    const acceptEncoding = req.headers.get("accept-encoding") || "";

    if (acceptEncoding.includes("gzip")) {
      const compressed = Bun.gzipSync(body);

      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", compressed.length.toString());
      headers.set("Vary", "Accept-Encoding");

      return new Response(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

const server = Bun.serve<WSData>({
  port: 3000,
  fetch(req) {
    const cors = corsHeaders();
    if (req.method === "OPTIONS") {
      return new Response("Departed", { status: 204, headers: cors });
    }
    return new Response(null, { status: 404 });
  },
  routes: {
    "/api/auth/*": authHandlerWrapper,
    "/page/create": { POST: withCors((req) => pageHandler.createPage(req)) },
    "/page/get": { GET: withCors((req) => pageHandler.getPage(req)) },
    "/page/user": { GET: withCors((req) => pageHandler.getPagesByUser(req)) },
    "/page/update": { PATCH: withCors((req) => pageHandler.updatePage(req)) },
    "/page/delete": { DELETE: withCors((req) => pageHandler.deletePage(req)) },
    "/shape/create": { POST: withCors((req) => shapeHandler.createShape(req)) },
    "/shape/get": { GET: withCors((req) => shapeHandler.getShape(req)) },
    "/shape/page": { GET: withCors((req) => shapeHandler.getShapesByPage(req)) },
    "/shape/session": { GET: withCors((req) => shapeHandler.getShapesBySession(req)) },
    "/shape/update": { PATCH: withCors((req) => shapeHandler.updateShape(req)) },
    "/shape/delete": { DELETE: withCors((req) => shapeHandler.deleteShape(req)) },
    "/shape/sync": { POST: withCors((req) => shapeHandler.syncShapes(req)) },
    "/session/create": { POST: withCors((req) => sessionHandler.createSession(req)) },
    "/session/get": { GET: withCors((req) => sessionHandler.getSession(req)) },
    "/session/key": { GET: withCors((req) => sessionHandler.getSessionByKey(req)) },
    "/session/page": { GET: withCors((req) => sessionHandler.getSessionsByPage(req)) },
    "/session/page/active": { GET: withCors((req) => sessionHandler.getActiveSessionByPage(req)) },
    "/session/update": { PATCH: withCors((req) => sessionHandler.updateSession(req)) },
    "/session/end": { POST: withCors((req) => sessionHandler.endSession(req)) },
    "/session/delete": { DELETE: withCors((req) => sessionHandler.deleteSession(req)) },
    "/ws/:roomId": {
      GET: (req: Bun.BunRequest, server: Bun.Server<WSData>) => {
        const roomId = (req.params as { roomId: string }).roomId;
        const success = server.upgrade(req, { data: { roomId } });
        if (success) return undefined as unknown as Response;
        return new Response("WebSocket upgrade failed", { status: 400 });
      },
    },
    "/session/:sessionKey": {
      GET: (req: Bun.BunRequest, server: Bun.Server<WSData>) => {
        const sessionKey = (req.params as { sessionKey: string }).sessionKey;
        const success = server.upgrade(req, {
          data: { roomId: `session:${sessionKey}`, sessionKey },
        });
        if (success) return undefined as unknown as Response;
        return new Response("WebSocket upgrade failed", { status: 400 });
      },
    },
  },
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

    async open(ws) {
      const { roomId, sessionKey } = ws.data;
      let sessionId: string | undefined;

      if (sessionKey) {
        try {
          const session = await repos.sessions.findBySessionKey(sessionKey);
          if (!session) {
            console.log(`[ws] session not found: ${sessionKey}`);
            ws.close(4001, "Session not found");
            return;
          }
          if (!session.isActive) {
            console.log(`[ws] session is not active: ${sessionKey}`);
            ws.close(4002, "Session is not active");
            return;
          }
          if (session.expiresAt && session.expiresAt < new Date()) {
            console.log(`[ws] session has expired: ${sessionKey}`);
            ws.close(4003, "Session has expired");
            return;
          }
          sessionId = session.id;
          ws.data.sessionId = sessionId;
        } catch (err) {
          console.error(`[ws] error validating session:`, err);
          ws.close(5000, "Internal error");
          return;
        }
      }

      const room = getOrCreateRoom(roomId, sessionId, sessionKey);
      ws.data.cleanup = setupConnection(ws, room);
      console.log(
        `[ws] connected: ${roomId}, session: ${sessionId || "none"}, clients: ${room.conns.size}`,
      );
    },

    close(ws) {
      ws.data.cleanup?.();
      console.log(`[ws] disconnected: ${ws.data.roomId}`);
    },
  },
});

console.log(`[board-ws] Yjs WebSocket server running on port ${server.port}`);

// opencode -s ses_26fb51d0cffeaE51VNlTmfov7b
