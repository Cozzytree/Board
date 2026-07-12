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
import type Board from "@/board/board";
import type Shape from "@/board/shapes/shape";
import * as Y from "yjs";
import { getSessionByKey, endSession, type Session } from "@/lib/session-api";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { getShapesByPage } from "@/lib/shape-api";
import { RealTimeProvider, CursorStateManager, useRealTime } from "@/components/realtime-provider";
import { useYjsSync } from "@/board/useYjsSync";

export const Route = createFileRoute("/sessions/$sessionKey")({
  component: SessionPage,
  errorComponent: (err) => <div>{err?.error.message}</div>,
  loader: async ({ context, params }) => {
    const queryClient = (context as any).queryClient;
    const session = (await queryClient.ensureQueryData({
      queryKey: ["session", "key", params.sessionKey],
      queryFn: () => getSessionByKey(params.sessionKey),
    })) as Session | null;
    if (session === null) {
      throw new Error("Session not found");
    }
    return session;
  },
});

const THROTTLE_MS = 100;
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

function SessionPage() {
  const session = Route.useLoaderData();
  const { sessionKey } = Route.useParams();

  return (
    <RealTimeProvider url={`ws://localhost:3000/session`} docName={sessionKey}>
      <SessionInner session={session} sessionKey={sessionKey} />
    </RealTimeProvider>
  );
}

function SessionCursorLayer() {
  const { zoom, offset, activeShape, canvas } = useBoard();
  const { provider } = useRealTime();

  React.useEffect(() => {
     if (!provider) return;
     if (!activeShape) {
         provider.awareness?.setLocalStateField("selection", []);
         return;
     }
     if (activeShape.type === "selection") {
         // It's a group of selected shapes
         const ids = (activeShape as any).shapes.map((s: any) => s.ID());
         provider.awareness?.setLocalStateField("selection", ids);
     } else {
         provider.awareness?.setLocalStateField("selection", [activeShape.ID()]);
     }
  }, [activeShape, provider]);

  return (
    <CursorStateManager 
      view={{ scl: zoom / 100, x: offset[0], y: offset[1] }} 
      board={canvas}
    />
  );
}

function SessionInner({ session, sessionKey }: { session: Session; sessionKey: string }) {
  const navigate = useNavigate();
  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const boardRef = React.useRef<Board | null>(null);
  const [boardTrigger, setBoardTrigger] = React.useState(0);
  const [cursorCount, setCursorCount] = React.useState(0);
  const [isOwner, setIsOwner] = React.useState(false);

  const { theme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const { provider, doc } = useRealTime();
  const ySettingsRef = React.useRef<Y.Map<unknown> | null>(null);

  const shapesQuery = useQuery({
    queryKey: ["shapes", "session", sessionKey],
    queryFn: () => getShapesByPage(session.pageId),
    enabled: !!session,
  });

  const initialShapes = React.useMemo(
    () => shapesQuery.data?.map((s) => s.props),
    [shapesQuery.data],
  );

  const isLoading = shapesQuery.isLoading;

  const handleWindow = React.useCallback(() => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }, []);

  React.useEffect(() => {
    window.addEventListener("resize", handleWindow);
    return () => window.removeEventListener("resize", handleWindow);
  }, [handleWindow]);

  // Sync shapes via useYjsSync
  const { syncLocalShapes } = useYjsSync(doc, provider, boardRef.current);

  React.useEffect(() => {
    if (!provider) return;

    const updateCursorCount = () => {
      const states = provider.awareness?.getStates();
      let count = 0;
      const localId = provider.awareness?.clientID;
      states?.forEach((state, clientId) => {
        if (clientId !== localId && state.cursor && typeof state.cursor.x === "number") {
          count++;
        }
      });
      setCursorCount(count);
    };

    provider.awareness?.on("change", updateCursorCount);
    updateCursorCount();

    return () => {
      provider.awareness?.off("change", updateCursorCount);
    };
  }, [provider]);

  React.useEffect(() => {
    const board = boardRef.current;
    if (!board || !doc || !provider) {
      return;
    }

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

    const observer = (events: Y.YMapEvent<unknown>, txn: Y.Transaction) => {
      if (txn.local) return;

      events.changes.keys.forEach((change, key) => {
        if (key === "ownerClientId") {
          const newOwner = ySettings.get("ownerClientId") as number;
          const amOwner = newOwner === provider.awareness?.clientID;
          setIsOwner(amOwner);
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
    };

    ySettings.observe(observer);

    const onSynced = ({ state }: { state: boolean }) => {
      if (state) {
        const existingOwner = ySettings.get("ownerClientId") as number | undefined;
        if (!existingOwner) {
          ySettings.set("ownerClientId", provider.awareness?.clientID);
          setIsOwner(true);
        } else if (existingOwner === provider.awareness?.clientID) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }

        loadSettings();
      }
    };

    provider.on("synced", onSynced);

    // Initial load check if already synced
    if (provider.synced) {
      loadSettings();
    }

    return () => {
      ySettings.unobserve(observer);
      provider.off("synced", onSynced);
    };
  }, [boardTrigger, doc, provider]);

  const onBoardReady = React.useCallback((board: Board) => {
    if (!boardRef.current) {
      boardRef.current = board;
    }
    setBoardTrigger((t) => t + 1);
  }, []);

  const onDeleteShape = React.useCallback(
    (shapes: Shape[]) => {
      if (!doc) return;

      const yShapes = doc.getMap<string>("shapes");
      doc.transact(() => {
        for (const shape of shapes) {
          if (shape.type === "selection") continue;
          yShapes.delete(shape.ID());
        }
      });
    },
    [doc],
  );

  const onCursorMove = React.useCallback((e: { e: { x?: number; y?: number } }) => {
    const now = Date.now();
    if (now - lastCursorUpdate < THROTTLE_MS) return;
    lastCursorUpdate = now;
    const x = e.e.x ?? 0;
    const y = e.e.y ?? 0;
    provider?.awareness?.setLocalStateField("cursor", {
      x,
      y,
      id: provider.awareness.clientID,
    });
  }, [provider]);

  const onShapesChangedThrottled = React.useCallback(
    (board: Board) => {
      const now = Date.now();
      if (now - lastShapeUpdate < THROTTLE_MS) return;
      lastShapeUpdate = now;
      syncLocalShapes(board);
    },
    [syncLocalShapes],
  );

  const onThemeChange = React.useCallback(
    (settings: { theme?: "dark" | "light"; background?: string; foreground?: string }) => {
      if (!isOwner || !ySettingsRef.current) return;

      doc?.transact(() => {
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
    [isOwner, doc],
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

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <BoardProvider
        initialShapes={initialShapes}
        theme={theme}
        width={width}
        height={height}
        onShapesChanged={onShapesChangedThrottled}
        onDeleteShape={onDeleteShape}
        onBoardReady={onBoardReady}
        onThemeChange={onThemeChange}
        isOwner={isOwner}
        skipLocalStorage
        onCursorMove={onCursorMove}>
        <SessionBoardUI
          sessionKey={sessionKey}
          cursorCount={cursorCount}
          isOwner={isOwner}
          onEndSession={handleEndSession}
        />
        {boardRef.current && provider && <SessionCursorLayer />}
      </BoardProvider>
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
      <div className="absolute z-[999] right-10 top-5">
        <BoardCenterButton />
      </div>
      <div className="absolute z-[999] left-10 bottom-5">
        <BoardZoomControls />
      </div>
      {!isMinimal && activeShape &&
        <div className="absolute left-1/2 -translate-x-1/2 z-[999] top-5">
          <BoardShapeOptions />
        </div>
      }
    </>
  );
});
