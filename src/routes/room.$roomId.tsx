import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { useYjsSync } from "@/board/useYjsSync";
import { createFileRoute, Link } from "@tanstack/react-router";
import React from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import type { Board, Shape } from "@/board/index";
import { CursoeStateManager, RealTimeProvider, useRealTime } from "@/components/realtime-provider";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});

const THROTTLE_MS = 100;
let lastShapeUpdate = 0;
let lastCursorUpdate = 0;

function RoomPage() {
  const { roomId } = Route.useParams();

  return (
    <RealTimeProvider
      url={`ws://localhost:3000/ws/${roomId}`}
      docName={roomId}
    >
      <RoomInner roomId={roomId} />
    </RealTimeProvider>
  );
}

function RoomInner({ roomId }: { roomId: string }) {
  const { theme } = useTheme();
  const { provider, doc } = useRealTime();
  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const boardRef = React.useRef<Board | null>(null);
  const [_, setBoardReady] = React.useState(0);

  // Resize handler
  React.useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Connect board to Yjs via HocuspocusProvider
  const { syncLocalShapes } = useYjsSync(doc, provider, boardRef.current);

  const onBoardReady = React.useCallback((board: Board) => {
    boardRef.current = board;
    setBoardReady((t) => t + 1);
  }, []);

  const onShapesChanged = React.useCallback(
    (board: Board) => {
      const now = Date.now();
      if (now - lastShapeUpdate < THROTTLE_MS) return;
      lastShapeUpdate = now;
      syncLocalShapes(board);
    },
    [syncLocalShapes],
  );

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

  const onCursorMove = React.useCallback((e: {e: {x?: number, y?: number}}) => {
    const now = Date.now();
    if (now - lastCursorUpdate < THROTTLE_MS) return;
    lastCursorUpdate = now;
    const x = e.e.x ?? 0;
    const y = e.e.y ?? 0;
    provider?.awareness?.setLocalStateField("cursor", {
      x, y, id: provider.awareness.clientID
    })
  }, [provider]);

  return (
    <div className="w-full h-full relative">
      <BoardProvider
        theme={theme}
        width={width}
        height={height}
        onShapesChanged={onShapesChanged}
        onDeleteShape={onDeleteShape}
        onBoardReady={onBoardReady}
        skipLocalStorage
        onCursorMove={onCursorMove}
      >
        <RoomBoardUI roomId={roomId} />
        {boardRef.current && provider && <RoomCursorLayer />}
      </BoardProvider>
    </div>
  );
}

function RoomCursorLayer() {
  const { zoom, offset } = useBoard();
  return (
    <CursoeStateManager 
      view={{ scl: zoom / 100, x: offset[0], y: offset[1] }} 
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Board UI Component
// ─────────────────────────────────────────────────────────────────────────────

const RoomBoardUI = React.memo(function RoomBoardUI({
  roomId,
}: {
  roomId: string;
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

  const shortId = roomId.length > 8 ? roomId.slice(0, 8) + "…" : roomId;

  return (
    <>
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

        <button
          onClick={copyLink}
          className="text-[#6c7086] hover:text-[#cdd6f4] transition-colors p-0.5"
          title="Copy room link">
          {copied ? <Check size={12} className="text-[#a6e3a1]" /> : <Copy size={12} />}
        </button>
      </div>

      <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center max-w-[95vw] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!isMinimal && <BoardToolbar />}
      </div>
      {!isMinimal && <BoardLibrarySidebar />}

      <div className="absolute z-[999] top-4 right-16">
        <BoardCenterButton />
      </div>
      <div className="absolute z-[999] bottom-4 left-4 hidden md:flex">
        <BoardZoomControls />
      </div>

      {!isMinimal && activeShape && (
        <div className="absolute z-[999] top-4 left-1/2 -translate-x-1/2 max-w-[90vw] md:max-w-none overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <BoardShapeOptions />
        </div>
      )}
    </>
  );
});
