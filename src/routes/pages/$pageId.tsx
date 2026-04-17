import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Loader2 } from "lucide-react";
import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { useBoard } from "@/board/board-context";
import { useTheme } from "@/components/theme-provider";
import { getShapesByPage } from "@/lib/shape-api";
import { loadShapesFromProps } from "@/lib/shape-loader";
import { ShapeSyncManager } from "@/lib/shape-sync-manager";
import type { Board } from "@/board/index";

export const Route = createFileRoute("/pages/$pageId")({
  component: PageCanvas,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["shapes", "page", params.pageId],
      queryFn: () => getShapesByPage(params.pageId),
    });
  },
});

function PageCanvas() {
  const { pageId } = Route.useParams();
  const { theme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const shapesQuery = useQuery({
    queryKey: ["shapes", "page", pageId],
    queryFn: () => getShapesByPage(pageId),
    enabled: !!pageId,
  });

  const boardRef = React.useRef<Board | null>(null);
  const syncManagerRef = React.useRef<ShapeSyncManager | null>(null);

  React.useEffect(() => {
    if (!pageId) return;

    syncManagerRef.current = new ShapeSyncManager({
      pageId,
      debounceMs: 500,
      thresholdMs: 3000,
    });

    return () => {
      void syncManagerRef.current?.destroy();
    };
  }, [pageId]);

  const handleBoardReady = React.useCallback(
    (board: Board) => {
      boardRef.current = board;

      if (shapesQuery.data && shapesQuery.data.length > 0) {
        loadShapesFromProps(board, shapesQuery.data);
      }

      board.on("shape:created", (s) => {
        s.e.target?.forEach((shape) => {
          if (shape.type !== "selection")
            syncManagerRef.current?.markCreated(shape.ID(), shape.toObject());
        });
      });

      board.on("shape:updated", (s) => {
        s.e.target?.forEach((shape) => {
          syncManagerRef.current?.markDirty(shape.ID(), shape.toObject());
        });
      });

      board.on("shape:delete", (s) => {
        console.log(s);
        s.e.target?.forEach((shape) => {
          syncManagerRef.current?.markDeleted(shape.ID());
        });
      });

      // board.on("mouseup", () => {
      //   board.shapeStore.forEach((shape) => {
      //     if (shape.type !== "selection") {
      //       syncManagerRef.current?.markDirty(shape.ID(), shape.toObject());
      //     }
      //     return false;
      //   });
      // });
    },
    [shapesQuery.data],
  );

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pageId]);

  if (isLoading || shapesQuery.isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Loader2 size={32} className="text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <BoardProvider
        initialShapes={shapesQuery?.data?.map((s) => s.props)}
        container={containerRef}
        theme={theme || "light"}
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        onBoardReady={handleBoardReady}
        skipLocalStorage>
        <BoardUI />
      </BoardProvider>
    </div>
  );
}

function BoardUI() {
  const { isMinimal, activeShape } = useBoard();

  return (
    <>
      <div className="pointer-events-auto z-50 absolute left-1/2 bottom-10 -translate-x-1/2 flex justify-center">
        {!isMinimal && <BoardToolbar />}
      </div>
      <div className="absolute left-2 top-2 z-[999]">
        <BoardCenterButton />
      </div>

      <div className="absolute left-2 bottom-2 z-[999]">
        <BoardZoomControls />
      </div>
      {!isMinimal && activeShape && (
        <div className="absolute w-fit left-1/2 -translate-x-1/2 z-[999] top-3">
          <BoardShapeOptions />
        </div>
      )}
    </>
  );
}
