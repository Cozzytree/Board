import { BoardToolbar } from "@/board/components/toolbar";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { useTheme } from "@/components/theme-provider";
import { StatsForNerds } from "@/board/components/stat";
import CanvasOptions from "@/board/components/canvas_options";
import { MenuIcon, RedoIcon, UndoIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
const BoardProvider = React.lazy(() =>
   import("@/board/board_provider").then((m) => ({
      default: m.BoardProvider
   }))
)
const ExcalidrawOptionsPanel = React.lazy(() =>
   import("../../src/components/excalidraw-style-options")
);

export const Route = createFileRoute("/local")({
   component: LocalBoardPage,
});

function LocalBoardPage() {
   const { theme, setTheme } = useTheme();
   const [width, setWidth] = React.useState(window.innerWidth);
   const [height, setHeight] = React.useState(window.innerHeight);
   const handleWindow = React.useCallback(() => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
   }, []);

   React.useEffect(() => {
      window.addEventListener("resize", handleWindow);
      return () => window.removeEventListener("resize", handleWindow);
   }, [handleWindow]);

   return (
      <Suspense fallback={null}>
         <div className="w-full h-full">
            <BoardProvider
               onThemeChange={(t) => {
                  if (t.theme)
                     setTheme(t.theme);
               }}
               theme={theme} width={width} height={height}>
               <BoardUI />
            </BoardProvider>
         </div>
      </Suspense>
   );
}

/** Separated so it can call useBoard() inside the provider tree */
function BoardUI() {
   const { isMinimal, undo, redo, undoStack, redoStack } = useBoard();

   return (
      <>
         {/* Global File Input for loading boards. Placed here so it survives DropdownMenu unmounts */}
         <input
            type="file"
            accept=".json"
            className="hidden"
            id="global-board-upload"
            onChange={(e) => {
               // Fix Radix UI bug where file picker freezes body pointer events
               document.body.style.pointerEvents = "auto";

               const file = e.target.files?.item(0);
               if (!file) {
                  console.log("No file selected");
                  return;
               }

               const reader = new FileReader();
               reader.onload = (evt) => {
                  try {
                     const result = evt.target?.result as string;
                     const data = JSON.parse(result);
                     if (data && Array.isArray(data.shapes)) {
                        localStorage.setItem("board_shapes", JSON.stringify(data.shapes));
                        window.location.reload();
                     } else {
                        alert("Invalid board file format.");
                     }
                  } catch (err) {
                     console.error("Failed to parse board file", err);
                     alert("Could not load file.");
                  }
               };
               reader.readAsText(file);
               e.target.value = "";
            }}
         />

         <div className="pointer-events-auto z-50 fixed right-0 md:left-1/2 -translate-x-1/2 bottom-4 flex justify-center max-w-[95vw] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {!isMinimal && <BoardToolbar />}
         </div>

         <div className="w-full flex justify-between items-center z-[99] px-5 fixed top-0 left-0 h-10">
            <Popover>
               <PopoverTrigger className="bg-muted px-1 rounded-sm">
                  <MenuIcon width={15} className="text-muted-foreground" />
               </PopoverTrigger>
               <PopoverContent
                  align="end"
                  className="p-1"
                  onInteractOutside={(e) => {
                     if (e.type === "focusoutside") {
                        e.preventDefault();
                     }
                  }}
               >
                  <CanvasOptions />
               </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
               <div className="">
                  <BoardCenterButton />
               </div>
               {!isMinimal &&
                  <div>
                     <BoardLibrarySidebar className="z-[999]" />
                  </div>
               }
            </div>
         </div>

         <div className="absolute z-[999] bottom-2 left-2 flex items-center gap-2">
            <BoardZoomControls />
            <Button
               onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  undo();
               }}
               onPointerDown={(e) => e.stopPropagation()}
               onPointerUp={(e) => e.stopPropagation()}
               disabled={undoStack.length <= 1}
               variant={"outline"} size="xs"
               className="border-none">
               <UndoIcon />
            </Button>
            <Button
               onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  redo();
               }}
               onPointerDown={(e) => e.stopPropagation()}
               onPointerUp={(e) => e.stopPropagation()}
               disabled={redoStack.length === 0}
               variant={"outline"}
               size="xs"
               className="border-none">
               <RedoIcon />
            </Button>
         </div>
         <StatsForNerds className="backdrop-blur fixed z-[999] top-10 md:top-15 right-2 md:right-5" />
         <Suspense fallback={null}>
            <ExcalidrawOptionsPanel />
         </Suspense>
      </>
   );
}
