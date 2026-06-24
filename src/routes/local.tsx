import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTheme } from "@/components/theme-provider";
import { StatsForNerds } from "@/board/components/stat";
import CanvasOptions from "@/board/components/canvas_options";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MenuIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
   );
}

/** Separated so it can call useBoard() inside the provider tree */
function BoardUI() {
   const { isMinimal, activeShape } = useBoard();

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

               console.log("Loading file:", file.name);
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

         <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center max-w-[95vw] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {!isMinimal && <BoardToolbar />}
         </div>
         {!isMinimal &&
            <div className="absolute top-5 right-5 z-50">
               <BoardLibrarySidebar className="z-[999]" />
            </div>
         }

         <div className="absolute z-[999] top-4 right-16">
            <BoardCenterButton />
         </div>

         <Popover>
            <PopoverTrigger className="absolute bg-muted z-[999] px-1 rounded-sm left-4 top-5">
               <MenuIcon width={15} className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent
               align="end"
               onInteractOutside={(e) => {
                  if (e.type === "focusoutside") {
                     e.preventDefault();
                  }
               }}
            >
               <CanvasOptions />
            </PopoverContent>
         </Popover>

         <div className="absolute z-[999] bottom-2 left-2 hidden md:flex">
            <BoardZoomControls />
         </div>
         {!isMinimal && activeShape && (
            <div className="absolute z-[999] top-4 left-1/2 -translate-x-1/2 max-w-[90vw] md:max-w-none overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
               <BoardShapeOptions />
            </div>
         )}
         <StatsForNerds className="bg-background fixed z-[999] top-20 right-5" />
      </>
   );
}
