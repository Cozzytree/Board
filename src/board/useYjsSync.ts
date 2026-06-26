import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { Board } from "./index";
import { Shape } from "./index";
import { generateShapeByShapeType } from "./utils/utilfunc";

/**
 * Custom hook that binds a Board instance to a Yjs shared document via HocuspocusProvider.
 *
 * Shapes are stored in a Y.Map<string> keyed by shape ID, with JSON-serialized values.
 * - Local changes  → pushed into Y.Map via `syncLocalShapes()`
 * - Remote changes → diffed against board.shapeStore, shapes added/updated/removed
 *
 * The Y.Doc and HocuspocusProvider are created externally (by RealTimeProvider)
 * and passed in here. This hook only handles the shape ↔ Y.Map binding.
 */
export function useYjsSync(
   doc: Y.Doc | null,
   provider: HocuspocusProvider | null,
   board: Board | null,
) {
   const suppressRemoteRef = useRef(false);
   const boardRef = useRef<Board | null>(null);

   // ── Set up board-dependent logic when all three deps are available ──
   useEffect(() => {
      if (!board || !doc || !provider) return;

      boardRef.current = board;

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
                           "_cachedPath",
                           "_cachedScale",
                           "_cachedPointsLen",
                           "cachedLocalPath"
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
                     existing.connections?.forEach((conn) => {
                        conn.s.connections?.delete(key);
                        return false;
                     });
                     
                     // Clean up from active selection if it exists
                     if (currentBoard.activeShapes?.type === "selection") {
                        const sel = currentBoard.activeShapes as any;
                        sel.shapes = sel.shapes.filter((s: any) => s.s.ID() !== key);
                        if (sel.shapes.length === 0) {
                           currentBoard.discardActiveShapes();
                        }
                     } else if (currentBoard.activeShapes?.ID() === key) {
                        currentBoard.discardActiveShapes();
                     }

                     currentBoard.shapeStore.removeById(key);
                  }
               }
            });

            // Rebuild connections from serialized data
            rebuildConnections(currentBoard, yShapes);

            if (currentBoard.activeShapes?.type === "selection") {
               (currentBoard.activeShapes as any).setCoords();
            }

            currentBoard.render();
         } finally {
            suppressRemoteRef.current = false;
         }
      };

      yShapes.observe(observer);

      // ── Initial load from remote state ──
      // HocuspocusProvider emits "synced" with { state: boolean }
      const onSynced = ({ state }: { state: boolean }) => {
         console.log("[yjs] synced with server, state:", state);
         if (state) {
            loadMissingShapes();
         }
      };

      provider.on("synced", onSynced);

      // ── Check if already synced (connection happened before observer attached) ──
      if (provider.synced) {
         console.log("[yjs] Already synced, loading shapes immediately");
         loadMissingShapes();
      }

      return () => {
         yShapes.unobserve(observer);
         provider.off("synced", onSynced);
      };
   }, [board, doc, provider]);

   // ── Push local state to Y.Map ──
   const syncLocalShapes = useCallback(
      (boardInstance: Board) => {
         if (!doc || suppressRemoteRef.current) return;

         // Update the board ref when sync is called
         boardRef.current = boardInstance;

         const yShapes = doc.getMap<string>("shapes");

         doc.transact(() => {
            boardInstance.shapeStore.forEach((s) => {
               if (s.type === "selection") return false;

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
      [doc],
   );

   return { syncLocalShapes };
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
