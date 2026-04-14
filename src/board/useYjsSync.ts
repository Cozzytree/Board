import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Board } from "./index";
import { Shape } from "./index";
import { generateShapeByShapeType } from "./utils/utilfunc";

const WS_URL = "ws://localhost:3000";

/**
 * Custom hook that binds a Board instance to a Yjs shared document via WebSocket.
 *
 * Shapes are stored in a Y.Map<string> keyed by shape ID, with JSON-serialized values.
 * - Local changes  → pushed into Y.Map via `syncLocalShapes()`
 * - Remote changes → diffed against board.shapeStore, shapes added/updated/removed
 */
export function useYjsSync(roomId: string | undefined, board: Board | null) {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const suppressRemoteRef = useRef(false);
  const boardRef = useRef<Board | null>(null);

  // ── Step 1: Initialize WebSocket connection immediately when roomId is available ──
  useEffect(() => {
    if (!roomId) return;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, roomId, doc, {
      connect: true,
    });

    docRef.current = doc;
    providerRef.current = provider;

    return () => {
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
  }, [roomId]);

  // ── Step 2: Set up board-dependent logic when board becomes available ──
  useEffect(() => {
    if (!board) return;

    boardRef.current = board;
    const doc = docRef.current;
    const provider = providerRef.current;

    if (!doc || !provider) {
      console.error("[yjs] Doc or provider not initialized");
      return;
    }

    const yShapes = doc.getMap<string>("shapes");

    // ── Load missing shapes from remote (used for initial sync) ──
    const loadMissingShapes = () => {
      const currentBoard = boardRef.current;
      if (!currentBoard) return;

      suppressRemoteRef.current = true;
      try {
        yShapes.forEach((raw, key) => {
          const existing = currentBoard.shapeStore.get(key);
          if (!existing) {
            try {
              const obj = JSON.parse(raw);
              const shape = generateShapeByShapeType(obj as any, currentBoard, currentBoard.ctx);
              if (shape) {
                shape.id = key;
                currentBoard.shapeStore.insert(shape);
              }
            } catch (err) {
              console.error("[yjs] Failed to load shape:", key, err);
            }
          }
        });

        rebuildConnections(currentBoard, yShapes);
        currentBoard.render();
      } finally {
        suppressRemoteRef.current = false;
      }
    };

    // ── Handle remote changes ──
    const observer = (events: Y.YMapEvent<string>, _txn: Y.Transaction) => {
      // Skip if this transaction originated from our own sync
      if (_txn.local) return;

      const currentBoard = boardRef.current;
      if (!currentBoard) return;

      suppressRemoteRef.current = true;

      console.log("change event keys:", [...events.changes.keys.entries()]);
      
      try {
        // Process changes - only add/update shapes, don't delete unless explicitly deleted
        events.changes.keys.forEach((change, key) => {
          if (change.action === "add" || change.action === "update") {
            const raw = yShapes.get(key);
            if (!raw) return;

            try {
              const obj = JSON.parse(raw);
              const existing = currentBoard.shapeStore.get(key);

              if (existing) {
                // Update existing shape properties
                const updates: Record<string, any> = {};
                const skipKeys = new Set([
                  "id",
                  "type",
                  "connections",
                  "ctx",
                  "_board",
                  "eventListeners",
                  "shapes",
                ]);

                for (const prop of Object.keys(obj)) {
                  if (skipKeys.has(prop)) continue;
                  updates[prop] = obj[prop];
                }

                existing.set(updates);

                // Handle points for lines/paths
                if (obj.points && Array.isArray(obj.points)) {
                  (existing as any).points = obj.points;
                }
              } else {
                // Create new shape from serialized data
                const shape = generateShapeByShapeType(obj as any, currentBoard, currentBoard.ctx);
                if (shape) {
                  // Preserve the original ID
                  shape.id = key;
                  currentBoard.shapeStore.insert(shape);
                }
              }
            } catch (err) {
              console.error("[yjs] Failed to deserialize shape:", key, err);
            }
          } else if (change.action === "delete") {
            // Remove shape from local store
            const existing = currentBoard.shapeStore.get(key);
            if (existing) {
              // Clean up connections
              existing.connections?.forEach((conn) => {
                conn.s.connections?.delete(key);
                return false;
              });
              currentBoard.shapeStore.removeById(key);
            }
          }
        });

        // Rebuild connections from serialized data
        rebuildConnections(currentBoard, yShapes);

        currentBoard.render();
      } finally {
        suppressRemoteRef.current = false;
      }
    };

    yShapes.observe(observer);

    // ── Initial load from remote state ──
    const onSync = (isSynced: boolean) => {
      console.log("[yjs] synced with server, isSynced:", isSynced);
      if (isSynced) {
        loadMissingShapes();
      }
    };

    provider.on("sync", onSync);

    // ── Check if already synced (connection happened before observer attached) ──
    if (provider.synced) {
      console.log("[yjs] Already synced, loading shapes immediately");
      loadMissingShapes();
    }

    return () => {
      yShapes.unobserve(observer);
      provider.off("sync", onSync);
    };
  }, [board]);

  // ── Push local state to Y.Map ──
  const syncLocalShapes = useCallback(
    (boardInstance: Board) => {
      const doc = docRef.current;
      if (!doc || !roomId || suppressRemoteRef.current) return;

      // Update the board ref when sync is called
      boardRef.current = boardInstance;

      const yShapes = doc.getMap<string>("shapes");

      doc.transact(() => {
        // Collect current local shape IDs
        const localIds = new Set<string>();
        boardInstance.shapeStore.forEach((s) => {
          if (s.type === "selection") return false;
          localIds.add(s.ID());

          try {
            // Serialize shape
            const serialized = serializeShape(s);
            const json = JSON.stringify(serialized);

            // Only update if changed
            const existing = yShapes.get(s.ID());
            if (existing !== json) {
              yShapes.set(s.ID(), json);
            }
          } catch (err) {
            console.error("[yjs] Failed to serialize shape:", s.ID(), err);
          }
          return false;
        });


      });
    },
    [roomId],
  );

  return { syncLocalShapes, provider: providerRef, doc: docRef };
}

/** Serialize a Shape to a plain object suitable for JSON */
function serializeShape(shape: Shape): Record<string, any> {
  const obj = shape.toObject();
  // Remove non-serializable fields
  const clean: Record<string, any> = {};
  const skipKeys = new Set([
    "ctx",
    "_board",
    "eventListeners",
    "indicator",
    "lastFlippedState",
    "lastPoints",
  ]);

  for (const key of Object.keys(obj)) {
    if (key.startsWith("_") || skipKeys.has(key)) continue;
    clean[key] = (obj as any)[key];
  }

  return clean;
}

/** Rebuild inter-shape connections after syncing from remote */
function rebuildConnections(board: Board, yShapes: Y.Map<string>) {
  yShapes.forEach((raw, _key) => {
    try {
      const obj = JSON.parse(raw);
      if (!obj.id || !Array.isArray(obj.connections) || obj.connections.length === 0) return;

      const shape = board.shapeStore.get(obj.id);
      if (!shape) return;

      // Clear existing connections and rebuild
      // (only if the shape has serialized connection data)
      for (const conn of obj.connections) {
        if (!conn.shapeId) continue;
        const target = board.shapeStore.get(conn.shapeId);
        if (!target) continue;

        // Check if connection already exists
        let alreadyExists = false;
        shape.connections.forEach((c) => {
          if (c.s.ID() === conn.shapeId && c.connected === conn.connected) {
            alreadyExists = true;
            return true;
          }
          return false;
        });

        if (!alreadyExists) {
          shape.connections.add({
            s: target,
            connected: conn.connected,
            anchor: conn.anchor,
            coords: conn.coords || { x: 50, y: 50 },
          });
        }
      }
    } catch {
      /* ignore */
    }
  });
}
