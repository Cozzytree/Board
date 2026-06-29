import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { Loader2, MenuIcon, RedoIcon, UndoIcon } from "lucide-react";
import { BoardToolbar } from "@/board/components/toolbar";
import {
   StrokeDash,
   StrokeOption,
   StrokeSize,
   OpacityOption,
   ZOrderButtons,
   VerticalAlignOptions,
   AlignOptions,
   ItalicOption,
   BoldOption,
   FillOption,
   RoughnessOption,
   FontFamilyOption,
   FontSizes,
   RotationOption,
   FillStyleOption,
   DuplicateOption,
   DeleteOption
} from "@/board/components/shapeoptions";
import { Button } from "@/components/ui/button";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { useBoard } from "@/board/board-context";
import { useTheme } from "@/components/theme-provider";
import { getShapesByPage } from "@/lib/shape-api";

import { getPage } from "@/lib/page-api";
import { ShapeSyncManager } from "@/lib/shape-sync-manager";
import type { Board } from "@/board/index";
import { LibrarySidebar } from "@/board/components/library_sidebar";
import { StatsForNerds } from "@/board/components/stat";
import CanvasOptions from "@/board/components/canvas_options";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { PopoverTrigger } from "@radix-ui/react-popover";
const ExcalidrawOptionsPanel = React.lazy(() =>
   import("@/components/excalidraw-style-options")
);
const BoardProvider = React.lazy(() =>
   import("@/board/board_provider").then((m) => ({
      default: m.BoardProvider
   }))
)

export const Route = createFileRoute("/pages/$pageId")({
   component: PageCanvas,
   loader: async ({ context, params }) => {
      const [page, shapes] = await Promise.all([
         context.queryClient.fetchQuery({
            queryKey: ["page", params.pageId],
            queryFn: () => getPage(params.pageId),
         }),
         context.queryClient.fetchQuery({
            queryKey: ["shapes", "page", params.pageId],
            queryFn: () => getShapesByPage(params.pageId),
         }),
      ]);
      return { page, shapes };
   },
});

function PageCanvas() {
   const { pageId } = Route.useParams();
   const { page, shapes } = Route.useLoaderData();
   const { theme, setTheme } = useTheme();
   const containerRef = React.useRef<HTMLDivElement>(null);
   const [isLoading, setIsLoading] = React.useState(true);
   const boardRef = React.useRef<Board | null>(null);
   const syncManagerRef = React.useRef<ShapeSyncManager | null>(null);
   const [width, setWidth] = React.useState(0);
   const [height, setHeight] = React.useState(0);

   React.useEffect(() => {
      if (!pageId) return;

      syncManagerRef.current = new ShapeSyncManager({
         pageId,
         debounceMs: 3000,
         thresholdMs: 3000,
      });

      return () => {
         void syncManagerRef.current?.destroy();
      };
   }, [pageId]);

   const handleBoardReady = React.useCallback((board: Board) => {
      boardRef.current = board;

      const onShapeCreated = (s: unknown) => {
         const eventData = s as { e: { target?: import("@/board/index").Shape[] } };
         eventData.e.target?.forEach((shape: import("@/board/index").Shape) => {
            if (shape.type !== "selection")
               syncManagerRef.current?.markCreated(shape.ID(), shape.toObject());
         });
      };

      const onMouseUp = () => {
         board.shapeStore.forEach((shape) => {
            if (shape.type !== "selection") {
               syncManagerRef.current?.markDirty(shape.ID(), shape.toObject());
            }
            return false;
         });
      };

      const onShapeDelete = (s: unknown) => {
         const eventData = s as { e: { target?: import("@/board/index").Shape[] } };
         eventData.e.target?.forEach((shape: import("@/board/index").Shape) => {
            syncManagerRef.current?.markDeleted(shape.ID());
         });
      };

      board.on("shape:created", onShapeCreated);
      board.on("mouseup", onMouseUp);
      board.on("shape:delete", onShapeDelete);
   }, []);

   React.useEffect(() => {
      if (!containerRef) return;
      const updateBox = () => {
         setWidth(containerRef.current?.clientWidth ?? window.innerWidth);
         setHeight(containerRef.current?.clientHeight ?? window.innerWidth);
      }
      window.addEventListener("resize", updateBox);
      updateBox();

      return () => {
         window.removeEventListener("resize", updateBox);
      }
   }, [])

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
      <div ref={containerRef} className="w-full h-screen overflow-hidden relative">
         <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
               <Loader2 className="animate-spin" />
            </div>
         }>
            <BoardProvider
               key={pageId}
               canvasLock={page.isLocked}
               initialShapes={shapes?.map((s) => s.props)}
               container={containerRef}
               theme={theme || "light"}
               width={width}
               height={height}
               onBoardReady={handleBoardReady}
               skipLocalStorage
               onThemeChange={(t) => {
                  if (t.theme)
                     setTheme(t.theme);
               }}
            >
               <PageContent title={page?.title} />
            </BoardProvider>
         </Suspense>
      </div>
   );
}

function PageContent({ title }: { title: string }) {
   return (
      <>
         <header className="w-full bg-background h-fit absolute top-0 left-0 z-[99] border-b">
            <div className="w-full flex items-center justify-between py-1.5 px-3">
               <div className="flex items-center gap-2">
                  <Popover>
                     <PopoverTrigger className="border px-1 rounded hover:bg-muted text-muted-foreground">
                        <MenuIcon width={13} />
                     </PopoverTrigger>
                     <PopoverContent align="start" className="z-[9999]">
                        <CanvasOptions />
                     </PopoverContent>
                  </Popover>
                  <span className="text-sm">
                     {title}
                  </span>
               </div>
               <LibrarySidebar className="z-[99999]" />
            </div>
         </header>
         <BoardUI />
      </>
   )
}

function BoardUI() {
   const { isMinimal, undo, redo, undoStack, redoStack } = useBoard();

   return (
      <>
         <div className="pointer-events-auto z-50 absolute left-1/2 bottom-10 -translate-x-1/2 flex justify-center">
            {!isMinimal && <BoardToolbar />}
         </div>

         <div className="absolute left-10 top-2 z-[999]">
            <BoardCenterButton />
         </div>

         <div className="absolute left-2 bottom-2 z-[999]">
            <div className="flex items-center gap-2">
               <BoardZoomControls />
               <Button
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  variant={"outline"} size="xs"
                  className="border-none">
                  <UndoIcon />
               </Button>
               <Button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  variant={"outline"}
                  size="xs"
                  className="border-none">
                  <RedoIcon />
               </Button>
            </div>
         </div >
         <div className="absolute right-2 top-20 z-[99]">
            <StatsForNerds />
         </div>

         <Suspense fallback={null}>
            <ExcalidrawOptionsPanel />
         </Suspense>
      </>
   );
}
