import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import type { Board, Shape } from "@/board/index";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { generateShapeByShapeType } from "@/board/utils/utilfunc";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});

// Stable color palette for remote cursors
const CURSOR_COLORS = [
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
  "#a855f7", // purple
];

function getColorForClient(clientId: number): string {
  return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

type CursorState = {
  x: number;
  y: number;
  id?: number;
  name?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions (copied from useYjsSync.ts - to be refactored later)
// ─────────────────────────────────────────────────────────────────────────────

function serializeShape(shape: Shape): Record<string, unknown> {
  const obj = shape.toObject();
  const clean: Record<string, unknown> = {};
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
    clean[key] = (obj as Record<string, unknown>)[key];
  }

  return clean;
}

function rebuildConnections(board: Board, yShapes: Y.Map<string>) {
  yShapes.forEach((raw) => {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      if (!obj.id || !Array.isArray(obj.connections) || obj.connections.length === 0) return;

      const shape = board.shapeStore.get(obj.id as string);
      if (!shape) return;

      for (const conn of obj.connections as Array<Record<string, unknown>>) {
        if (!conn.shapeId) continue;
        const target = board.shapeStore.get(conn.shapeId as string);
        if (!target) continue;

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
            connected: (conn.connected as "s" | "e") || "s",
            anchor: conn.anchor as "left" | "right" | "top" | "bottom" | undefined,
            coords: (conn.coords as { x: number; y: number }) || { x: 50, y: 50 },
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Room Page Component
// ─────────────────────────────────────────────────────────────────────────────

function RoomPage() {
  const { roomId } = Route.useParams();
  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const boardRef = React.useRef<Board | null>(null);
  const boardReadyRef = React.useRef(false);
  const [boardTrigger, setBoardTrigger] = React.useState(0);

  // Yjs refs
  const docRef = React.useRef<Y.Doc | null>(null);
  const providerRef = React.useRef<WebsocketProvider | null>(null);
  const suppressSyncRef = React.useRef(false);
  const syncToYjsRef = React.useRef<((board: Board) => void) | null>(null);

  const handleWindow = React.useCallback(() => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }, []);

  React.useEffect(() => {
    window.addEventListener("resize", handleWindow);
    return () => window.removeEventListener("resize", handleWindow);
  }, [handleWindow]);

  // ── Phase 1: Initialize Yjs connection when roomId is available ──
  React.useEffect(() => {
    if (!roomId) return;

    console.log("[yjs] Phase 1: Initializing connection for room:", roomId);

    // Create Y.Doc and WebsocketProvider
    const doc = new Y.Doc();
    const provider = new WebsocketProvider("ws://localhost:3000", roomId, doc);

    docRef.current = doc;
    providerRef.current = provider;

    console.log("[yjs] WebSocket provider created, connecting...");

    return () => {
      console.log("[yjs] Phase 1 cleanup");
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
  }, [roomId]);

  // ── Phase 2: Set up sync logic when board becomes available ──
  React.useEffect(() => {
    const board = boardRef.current;
    if (!board || !docRef.current || !providerRef.current) {
      // Board not ready yet, will re-run when boardRef.current is set
      console.log(
        "[yjs] Phase 2: waiting for board, board:",
        !!board,
        "doc:",
        !!docRef.current,
        "provider:",
        !!providerRef.current,
      );
      return;
    }

    // Prevent re-initialization if already set up
    if (boardReadyRef.current) return;
    boardReadyRef.current = true;

    console.log("[yjs] Phase 2: Board ready, setting up sync");

    const doc = docRef.current;
    const provider = providerRef.current;
    const yShapes = doc.getMap<string>("shapes");

    // ── Load shapes from Yjs to board ──
    const loadShapes = () => {
      if (suppressSyncRef.current) return;
      console.log("[yjs] Loading shapes from Yjs, count:", yShapes.size);

      suppressSyncRef.current = true;
      try {
        yShapes.forEach((raw, key) => {
          if (board.shapeStore.get(key)) return;

          try {
            const obj = JSON.parse(raw) as Record<string, unknown>;
            const shape = generateShapeByShapeType(
              obj as Parameters<typeof generateShapeByShapeType>[0],
              board,
              board.ctx,
            );
            if (shape) {
              shape.id = key;
              board.shapeStore.insert(shape);
              console.log("[yjs] Loaded shape:", key);
            }
          } catch (e) {
            console.error("[yjs] Failed to load shape:", key, e);
          }
        });

        rebuildConnections(board, yShapes);
        board.render();
      } finally {
        suppressSyncRef.current = false;
      }
    };

    // ── Handle remote changes ──
    const observer = (events: Y.YMapEvent<string>, txn: Y.Transaction) => {
      if (txn.local) return;

      console.log("[yjs] Remote change detected");

      suppressSyncRef.current = true;
      try {
        events.changes.keys.forEach((change, key) => {
          if (change.action === "add" || change.action === "update") {
            const raw = yShapes.get(key);
            if (!raw) return;

            try {
              const obj = JSON.parse(raw) as Record<string, unknown>;
              const existing = board.shapeStore.get(key);

              if (existing) {
                const updates: Record<string, unknown> = {};
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

                if (obj.points && Array.isArray(obj.points)) {
                  (existing as unknown as { points: unknown[] }).points = obj.points;
                }
              } else {
                const shape = generateShapeByShapeType(
                  obj as Parameters<typeof generateShapeByShapeType>[0],
                  board,
                  board.ctx,
                );
                if (shape) {
                  shape.id = key;
                  board.shapeStore.insert(shape);
                }
              }
            } catch (e) {
              console.error("[yjs] Failed to process remote shape:", key, e);
            }
          }
        });

        rebuildConnections(board, yShapes);
        board.render();
      } finally {
        suppressSyncRef.current = false;
      }
    };

    yShapes.observe(observer);

    // ── Sync when provider connects ──
    provider.on("sync", (isSynced: boolean) => {
      console.log("[yjs] Provider synced:", isSynced);
      if (isSynced) {
        loadShapes();
      }
    });

    // ── Check if already synced ──
    if (provider.synced) {
      console.log("[yjs] Already synced, loading immediately");
      loadShapes();
    }

    // ── Push local changes to Yjs ──
    const syncToYjs = (boardInstance: Board) => {
      if (suppressSyncRef.current || !docRef.current) return;

      const yShapesLocal = docRef.current.getMap<string>("shapes");

      docRef.current.transact(() => {
        boardInstance.shapeStore.forEach((shape) => {
          if (shape.type === "selection") return false;

          try {
            const serialized = serializeShape(shape);
            const json = JSON.stringify(serialized);
            const existing = yShapesLocal.get(shape.ID());

            if (existing !== json) {
              yShapesLocal.set(shape.ID(), json);
            }
          } catch (e) {
            console.error("[yjs] Failed to serialize shape:", shape.ID(), e);
          }
          return false;
        });
      });
    };

    syncToYjsRef.current = syncToYjs;

    return () => {
      console.log("[yjs] Phase 2 cleanup");
      yShapes.unobserve(observer);
      syncToYjsRef.current = null;
      boardReadyRef.current = false;
    };
  }, [boardTrigger]);

  // Callback wired into BoardProvider: called when board is first created
  const onBoardReady = React.useCallback((board: Board) => {
    boardRef.current = board;
    setBoardTrigger((t) => t + 1);
    console.log("[yjs] Board ready, triggering sync setup");
  }, []);

  // Callback wired into BoardProvider: called on every shape mutation
  const onShapesChanged = React.useCallback((board: Board) => {
    syncToYjsRef.current?.(board);
  }, []);

  return (
    <div className="w-full h-full">
      <BoardProvider
        width={width}
        height={height}
        onShapesChanged={onShapesChanged}
        onBoardReady={onBoardReady}
        skipLocalStorage
        onCursorMove={(e) => {
          providerRef.current?.awareness.setLocalStateField("cursor", {
            x: e.e.x,
            y: e.e.y,
            id: providerRef.current?.awareness.clientID,
          });
        }}>
        <RoomBoardUI roomId={roomId} boardRef={boardRef} provider={providerRef} />
      </BoardProvider>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Board UI Component (cursor overlay, room indicator, etc.)
// ─────────────────────────────────────────────────────────────────────────────

function RoomBoardUI({
  roomId,
  boardRef,
  provider,
}: {
  roomId: string;
  boardRef: React.RefObject<Board | null>;
  provider: React.RefObject<WebsocketProvider | null>;
}) {
  const { isMinimal, activeShape, canvas } = useBoard();
  const [copied, setCopied] = React.useState(false);
  const [remoteCursors, setRemoteCursors] = React.useState<Map<number, CursorState>>(new Map());

  // Keep boardRef in sync with the board from context
  React.useEffect(() => {
    if (canvas) boardRef.current = canvas;
  }, [canvas, boardRef]);

  // Listen to awareness changes for remote cursors
  React.useEffect(() => {
    const prov = provider.current;
    if (!prov) return;

    const onAwarenessChange = () => {
      const states = prov.awareness.getStates();
      const localId = prov.awareness.clientID;
      const cursors = new Map<number, CursorState>();

      states.forEach((state, clientId) => {
        if (clientId === localId) return;
        if (state.cursor && typeof state.cursor.x === "number") {
          cursors.set(clientId, state.cursor as CursorState);
        }
      });

      setRemoteCursors(cursors);
    };

    prov.awareness.on("change", onAwarenessChange);
    prov.awareness.on("update", onAwarenessChange);

    return () => {
      prov.awareness.off("change", onAwarenessChange);
      prov.awareness.off("update", onAwarenessChange);
    };
  }, [provider]);

  const copyLink = React.useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const shortId = roomId.length > 8 ? roomId.slice(0, 8) + "…" : roomId;

  const board = boardRef.current;
  const view = board?.view;

  return (
    <>
      {/* Remote cursors overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
        {Array.from(remoteCursors.entries()).map(([clientId, cursor]) => {
          const color = getColorForClient(clientId);
          const screenX = view ? cursor.x * view.scl + view.x : cursor.x;
          const screenY = view ? cursor.y * view.scl + view.y : cursor.y;

          return (
            <div
              key={clientId}
              className="absolute"
              style={{
                left: screenX,
                top: screenY,
                transition: "left 80ms linear, top 80ms linear",
              }}>
              <svg
                width="16"
                height="20"
                viewBox="0 0 16 20"
                fill="none"
                style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.5))` }}>
                <path
                  d="M0.928711 0.514648L14.9287 8.51465L7.92871 10.5146L4.92871 18.5146L0.928711 0.514648Z"
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                style={{
                  backgroundColor: color,
                  color: "white",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}>
                {cursor.name || `User ${clientId.toString().slice(-4)}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Room indicator pill */}
      <div
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-[#1e1e2e]/90 backdrop-blur-md border border-[#313244] shadow-lg">
        <Link
          to="/"
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          title="Back to home">
          <ArrowLeft size={14} />
        </Link>
        <div className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
        <span className="text-xs font-medium text-[#a6adc8] font-mono">{shortId}</span>

        {remoteCursors.size > 0 && (
          <div className="flex -space-x-1 ml-1">
            {Array.from(remoteCursors.keys())
              .slice(0, 5)
              .map((clientId) => (
                <div
                  key={clientId}
                  className="w-3 h-3 rounded-full border border-[#1e1e2e]"
                  style={{ backgroundColor: getColorForClient(clientId) }}
                  title={`User ${clientId.toString().slice(-4)}`}
                />
              ))}
            {remoteCursors.size > 5 && (
              <div className="w-3 h-3 rounded-full bg-[#45475a] border border-[#1e1e2e] flex items-center justify-center">
                <span className="text-[6px] text-white">+{remoteCursors.size - 5}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={copyLink}
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-0.5"
          title="Copy room link">
          {copied ? <Check size={12} className="text-[#a6e3a1]" /> : <Copy size={12} />}
        </button>
      </div>

      {/* Standard board UI */}
      <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center">
        {!isMinimal && <BoardToolbar />}
      </div>
      {!isMinimal && <BoardLibrarySidebar />}
      <BoardCenterButton />
      <BoardZoomControls />
      {!isMinimal && activeShape && <BoardShapeOptions />}
    </>
  );
}
