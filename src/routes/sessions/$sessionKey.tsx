import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { useBoard } from "@/board/board-context";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Copy, Check, ArrowLeft, X } from "lucide-react";
import type { Board, Shape } from "@/board/index";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { generateShapeByShapeType } from "@/board/utils/utilfunc";
import { getSessionByKey, endSession, type Session } from "@/lib/session-api";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { getShapesByPage } from "@/lib/shape-api";

export const Route = createFileRoute("/sessions/$sessionKey")({
  component: SessionPage,
  loader: async ({ context, params }) => {
    const queryClient = (context as any).queryClient;
    await queryClient.ensureQueryData({
      queryKey: ["session", "key", params.sessionKey],
      queryFn: () => getSessionByKey(params.sessionKey),
    });
  },
});

const TROTTLE_MS = 100;
let lastCursorUpdate = 0;
let lastShapeUpdate = 0;

const CURSOR_COLORS = [
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
];

function getColorForClient(clientId: number): string {
  return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

type CursorData = {
  x: number;
  y: number;
  id?: number;
  name?: string;
};

type RemoteCursor = {
  clientId: number;
  cursor: CursorData;
};

function CursorOverlay({
  cursors,
  view,
}: {
  cursors: RemoteCursor[];
  view: { x: number; y: number; scl: number } | undefined;
}) {
  if (cursors.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
      {cursors.map(({ clientId, cursor }) => {
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
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>
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
  );
}

function CursorStateManager({
  provider,
  board,
  onCursorCountChange,
}: {
  provider: WebsocketProvider | null;
  board: Board | null;
  onCursorCountChange: (count: number) => void;
}) {
  const [cursors, setCursors] = React.useState<RemoteCursor[]>([]);

  React.useEffect(() => {
    const prov = provider;
    if (!prov) return;

    const updateCursors = () => {
      const states = prov.awareness.getStates();
      const localId = prov.awareness.clientID;
      const remoteCursors: RemoteCursor[] = [];

      states.forEach((state, clientId) => {
        if (clientId === localId) return;
        if (state.cursor && typeof state.cursor.x === "number") {
          remoteCursors.push({
            clientId,
            cursor: state.cursor as CursorData,
          });
        }
      });

      setCursors(remoteCursors);
      onCursorCountChange(remoteCursors.length);
    };

    prov.awareness.on("change", updateCursors);
    updateCursors();

    return () => {
      prov.awareness.off("change", updateCursors);
    };
  }, [provider, onCursorCountChange]);

  return <CursorOverlay cursors={cursors} view={board?.view} />;
}

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

function SessionPage() {
  const { sessionKey } = Route.useParams();
  const navigate = useNavigate();
  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const [session, setSession] = React.useState<Session | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const boardRef = React.useRef<Board | null>(null);
  const boardReadyRef = React.useRef(false);
  const yjsSetupRef = React.useRef(false);
  const [boardTrigger, setBoardTrigger] = React.useState(0);
  const [cursorCount, setCursorCount] = React.useState(0);
  const [isOwner, setIsOwner] = React.useState(false);

  const { theme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const docRef = React.useRef<Y.Doc | null>(null);
  const providerRef = React.useRef<WebsocketProvider | null>(null);
  const suppressSyncRef = React.useRef(false);
  const syncToYjsRef = React.useRef<((board: Board) => void) | null>(null);
  const ySettingsRef = React.useRef<Y.Map<unknown> | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["session", "key", sessionKey],
    queryFn: () => getSessionByKey(sessionKey),
    enabled: !!sessionKey,
  });

  const shapesQuery = useQuery({
    queryKey: ["shapes", "session", sessionKey],
    queryFn: () => getShapesByPage(session!.pageId),
    enabled: !!session,
  });

  React.useEffect(() => {
    if (sessionQuery.data && !session) {
      setSession(sessionQuery.data);
    }
  }, [sessionQuery.data]);

  React.useEffect(() => {
    if (sessionQuery.error) {
      setError(
        sessionQuery.error instanceof Error ? sessionQuery.error.message : "Failed to load session",
      );
    }
  }, [sessionQuery.error]);

  const isLoading = sessionQuery.isLoading || shapesQuery.isLoading;

  const handleWindow = React.useCallback(() => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }, []);

  React.useEffect(() => {
    window.addEventListener("resize", handleWindow);
    return () => window.removeEventListener("resize", handleWindow);
  }, [handleWindow]);

  React.useEffect(() => {
    if (!sessionKey || !session) return;

    console.log("[yjs] Phase 1: Initializing connection for session:", sessionKey);

    const doc = new Y.Doc();
    console.log(sessionKey);
    const wsUrl = `ws://localhost:3000/session`;
    const provider = new WebsocketProvider(wsUrl, `${sessionKey}`, doc);

    docRef.current = doc;
    providerRef.current = provider;

    console.log("[yjs] WebSocket provider created for session, connecting...");

    return () => {
      console.log("[yjs] Phase 1 cleanup");
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
  }, [sessionKey, session]);

  React.useEffect(() => {
    const board = boardRef.current;
    if (!board || !docRef.current || !providerRef.current) {
      return;
    }

    if (yjsSetupRef.current) return;

    if (boardReadyRef.current) return;
    boardReadyRef.current = true;

    console.log("[yjs] Phase 2: Board ready, setting up sync");

    const doc = docRef.current;
    const provider = providerRef.current;
    const yShapes = doc.getMap<string>("shapes");

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

    const observer = (events: Y.YMapEvent<string>, txn: Y.Transaction) => {
      if (txn.local) return;

      console.log("[yjs] Remote change detected");

      suppressSyncRef.current = true;
      try {
        events.changes.keys.forEach((change, key) => {
          if (change.action === "delete") {
            const existing = board.shapeStore.get(key);
            if (existing) {
              existing.remove();
            }
            return;
          }

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

    const ySettings = doc.getMap<unknown>("settings");
    ySettingsRef.current = ySettings;

    const loadSettings = () => {
      const savedTheme = ySettings.get("theme") as "dark" | "light" | undefined;
      const savedBackground = ySettings.get("background") as string | undefined;
      const savedForeground = ySettings.get("foreground") as string | undefined;

      if (savedBackground) board.background = savedBackground;
      if (savedForeground) board.foreground = savedForeground;
      if (savedTheme) board.theme = savedTheme;
      board.render();
    };

    ySettings.observe((events, txn) => {
      if (txn.local) return;

      events.changes.keys.forEach((change, key) => {
        if (key === "ownerClientId") {
          const newOwner = ySettings.get("ownerClientId") as number;
          const amOwner = newOwner === provider.awareness.clientID;
          setIsOwner(amOwner);
          console.log("[yjs] Owner changed, am I owner:", amOwner);
        } else if (change.action !== "delete") {
          const value = ySettings.get(key);
          if (key === "theme" && (value === "dark" || value === "light")) {
            board.theme = value;
          } else if (key === "background" && typeof value === "string") {
            board.background = value;
          } else if (key === "foreground" && typeof value === "string") {
            board.foreground = value;
          }
        }
      });
      board.render();
    });

    provider.on("sync", (isSynced: boolean) => {
      console.log("[yjs] Provider synced:", isSynced);
      if (isSynced) {
        loadShapes();

        const existingOwner = ySettings.get("ownerClientId") as number | undefined;
        if (!existingOwner) {
          ySettings.set("ownerClientId", provider.awareness.clientID);
          setIsOwner(true);
          console.log("[yjs] I became the owner");
        } else if (existingOwner === provider.awareness.clientID) {
          setIsOwner(true);
          console.log("[yjs] I am the owner");
        } else {
          setIsOwner(false);
          console.log("[yjs] I am not the owner");
        }

        loadSettings();
      }
    });

    if (provider.synced) {
      console.log("[yjs] Already synced, loading immediately");
      loadShapes();
      loadSettings();
    }

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
    yjsSetupRef.current = true;

    return () => {
      console.log("[yjs] Phase 2 cleanup");
      yShapes.unobserve(observer);
      syncToYjsRef.current = null;
      yjsSetupRef.current = false;
    };
  }, [boardTrigger]);

  const onBoardReady = React.useCallback((board: Board) => {
    if (!boardRef.current) {
      boardRef.current = board;
    }
    setBoardTrigger((t) => t + 1);
  }, []);

  const onShapesChanged = React.useCallback((board: Board) => {
    syncToYjsRef.current?.(board);
  }, []);

  const onDeleteShape = (shapes: Shape[]) => {
    if (!docRef.current) return;

    suppressSyncRef.current = true;
    const yShapes = docRef.current.getMap<string>("shapes");

    docRef.current.transact(() => {
      for (const shape of shapes) {
        if (shape.type === "selection") continue;
        yShapes.delete(shape.ID());
      }
    });

    suppressSyncRef.current = false;
  };

  const onThemeChange = React.useCallback(
    (settings: { theme?: "dark" | "light"; background?: string; foreground?: string }) => {
      if (!isOwner || !ySettingsRef.current) return;

      docRef.current?.transact(() => {
        if (settings.theme !== undefined) {
          ySettingsRef.current?.set("theme", settings.theme);
        }
        if (settings.background !== undefined) {
          ySettingsRef.current?.set("background", settings.background);
        }
        if (settings.foreground !== undefined) {
          ySettingsRef.current?.set("foreground", settings.foreground);
        }
      });
    },
    [isOwner],
  );

  const handleEndSession = async () => {
    if (!session) return;
    try {
      await endSession(session.id);
      navigate({ to: "/pages" });
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Loader2 size={32} className="text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-red-500">{error}</p>
        <Link to="/pages" className="text-[#7c3aed] hover:underline">
          Back to Pages
        </Link>
      </div>
    );
  }

  console.log(shapesQuery.data);
  return (
    <div ref={containerRef} className="relative w-full h-full">
      <BoardProvider
        initialShapes={shapesQuery.data?.map((s) => s.props)}
        theme={theme}
        width={width}
        height={height}
        onShapesChanged={(b) => {
          const now = Date.now();
          if (now - lastShapeUpdate < TROTTLE_MS) return;
          lastShapeUpdate = now;
          onShapesChanged(b);
        }}
        onDeleteShape={onDeleteShape}
        onBoardReady={onBoardReady}
        onThemeChange={onThemeChange}
        isOwner={isOwner}
        skipLocalStorage
        onCursorMove={(e) => {
          const now = Date.now();
          if (now - lastCursorUpdate < TROTTLE_MS) return;
          lastCursorUpdate = now;
          providerRef.current?.awareness.setLocalStateField("cursor", {
            x: e.e.x,
            y: e.e.y,
            id: providerRef.current?.awareness.clientID,
          });
        }}>
        <SessionBoardUI
          sessionKey={sessionKey}
          cursorCount={cursorCount}
          isOwner={isOwner}
          onEndSession={handleEndSession}
        />
      </BoardProvider>

      <CursorStateManager
        provider={providerRef.current}
        board={boardRef.current}
        onCursorCountChange={setCursorCount}
      />
    </div>
  );
}

const SessionBoardUI = React.memo(function SessionBoardUI({
  sessionKey,
  cursorCount,
  isOwner,
  onEndSession,
}: {
  sessionKey: string;
  cursorCount: number;
  isOwner: boolean;
  onEndSession: () => void;
}) {
  const { isMinimal, activeShape } = useBoard();
  const [copied, setCopied] = React.useState(false);

  const copyLink = React.useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const shortKey = sessionKey.length > 8 ? sessionKey.slice(0, 8) + "…" : sessionKey;

  return (
    <>
      <div
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full
          bg-[#1e1e2e]/90 backdrop-blur-md border border-[#313244] shadow-lg">
        <Link
          to="/pages"
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors"
          title="Back to pages">
          <ArrowLeft size={14} />
        </Link>
        <div className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
        <span className="text-xs font-medium text-[#a6adc8] font-mono">Session {shortKey}</span>

        {cursorCount > 0 && (
          <div className="flex -space-x-1 ml-1">
            {Array.from({ length: Math.min(cursorCount, 5) }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border border-[#1e1e2e]"
                style={{ backgroundColor: CURSOR_COLORS[i % CURSOR_COLORS.length] }}
                title={`User ${i}`}
              />
            ))}
            {cursorCount > 5 && (
              <div className="w-3 h-3 rounded-full bg-[#45475a] border border-[#1e1e2e] flex items-center justify-center">
                <span className="text-[6px] text-white">+{cursorCount - 5}</span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={copyLink}
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-0.5"
          title="Copy session link">
          {copied ? <Check size={12} className="text-[#a6e3a1]" /> : <Copy size={12} />}
        </button>

        {isOwner && (
          <button
            onClick={onEndSession}
            className="text-[#6c7086] hover:text-red-400 transition-colors p-0.5 ml-1"
            title="End session">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center">
        {!isMinimal && <BoardToolbar />}
      </div>
      {/*{!isMinimal && <BoardLibrarySidebar />}*/}
      <BoardCenterButton />
      <BoardZoomControls />
      {!isMinimal && activeShape && <BoardShapeOptions />}
    </>
  );
});
