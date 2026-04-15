import { createFileRoute, useParams } from "@tanstack/react-router";
import React from "react";
import { Loader2 } from "lucide-react";
import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/pages/$pageId")({
  component: PageCanvas,
});

function PageCanvas() {
  const { pageId } = useParams({ from: "/pages/$pageId" });
  const { theme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pageId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <Loader2 size={32} className="text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <BoardProvider
        container={containerRef}
        theme={theme || "light"}
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}>
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
      {/*{!isMinimal && <BoardLibrarySidebar />}*/}
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
