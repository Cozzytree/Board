import { AlignOptions, BoldOption, DeleteOption, DuplicateOption, FillOption, FillStyleOption, FontFamilyOption, FontSizes, ItalicOption, OpacityOption, RotationOption, RoughnessOption, StrokeDash, StrokeOption, StrokeSize, VerticalAlignOptions, ZOrderButtons } from "@/board/components/shapeoptions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBoard } from "@/board/board-context";
import { AlignCenter, AlignVerticalSpaceAround, Layers3Icon, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import type { Board } from "@/lib.ts";

function DrawOptions({ board }: { board: Board }) {
   return (
      <div>
         <div>
            <Popover>
               <PopoverTrigger>
                  <SlidersHorizontal />
               </PopoverTrigger>
               <PopoverContent>
                  <span>Stroke width</span>
                  <div className="flex gap-1 items-center">
                     {Array.from({ length: 3 }).map((_, i) => <button onClick={() => {
                        board.currentTool.setConf("strokeWidth", (i + 2) * 2)
                     }} className="p-1 border">{(i + 2) * 2}</button>)}
                  </div>
               </PopoverContent>
            </Popover>
         </div>
      </div>
   )
}

export default function ExcalidrawOptionsPanel() {
   const isMobile = useIsMobile();
   const { activeShape, isMinimal, mode, canvas } = useBoard();
   const debounceMs = 200;
   const isDraw = mode?.m === "draw";

   if (isDraw && canvas !== null) {
      return (
         <DrawOptions board={canvas} />
      )
   }

   if (isMinimal || !activeShape) return null;

   if (isMobile) {
      return (
         <div className="w-full px-4 z-[999] pointer-events-auto flex justify-center">
            <div className="flex justify-start overflow-x-auto gap-2 p-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
               <StrokeOption debounceMs={debounceMs} className="z-[9999]" mobile />
               <FillOption debounceMs={debounceMs} className="z-[9999]" mobile />
               <Popover>
                  <PopoverTrigger>
                     <SlidersHorizontal />
                  </PopoverTrigger>
                  <PopoverContent>
                     <div className="flex flex-col items-start">
                        <span>Opacity</span>
                        <OpacityOption debounceMs={debounceMs} className="z-[9999]" standalone />
                     </div>
                     {activeShape.type !== "text" ?
                        <>
                           <StrokeSize debounceMs={debounceMs} className="z-[9999] flex gap-1" />
                           <StrokeDash debounceMs={debounceMs} className="z-[9999]" />
                        </> :
                        <></>
                     }
                     <FillStyleOption debounceMs={debounceMs} className="z-[9999]" />
                     <RoughnessOption debounceMs={debounceMs} className="z-[9999] w-fit" />
                     {activeShape?.text?.length ?
                        <>
                           <FontFamilyOption debounceMs={debounceMs} className="z-[9999]" standalone />
                           <FontSizes debounceMs={debounceMs} className="z-[9999]" />
                           <BoldOption debounceMs={debounceMs} />
                           <ItalicOption debounceMs={debounceMs} />
                           <AlignOptions debounceMs={debounceMs} icon={<AlignCenter />} />
                           <VerticalAlignOptions debounceMs={debounceMs} icon={<AlignVerticalSpaceAround />} />
                        </>
                        :
                        <></>
                     }
                     <RotationOption debounceMs={debounceMs} className="z-[9999]" />
                     <Popover>
                        <PopoverTrigger className="text-muted-foreground">
                           <Layers3Icon className="w-4 h-4" />
                        </PopoverTrigger>
                        <PopoverContent className="w-fit" side="top">
                           <ZOrderButtons className="flex items-center gap-1.5" debounceMs={debounceMs} />
                        </PopoverContent>
                     </Popover>
                  </PopoverContent>
               </Popover>
            </div>

         </div>
      );
   }

   const Content = () => (
      <div className="h-full p-4 overflow-y-auto">
         <div className="flex max-h-[80vh] flex-col gap-5 w-52 pointer-events-auto">
            <div className="flex flex-col gap-3">
               <div className="w-full flex flex-col justify-between items-start">
                  <span className="text-sm text-muted-foreground font-medium">Stroke</span>
                  <StrokeOption className="w-full" debounceMs={debounceMs} />
               </div>
               <div className="w-full flex flex-col justify-between items-start">
                  <span className="text-sm text-muted-foreground font-medium">Background</span>
                  <FillOption className="w-full" debounceMs={debounceMs} />
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="w-full flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Opacity</span>
                  <OpacityOption debounceMs={debounceMs} standalone />
               </div>
               {activeShape.type !== "text" &&
                  <div className="w-full flex items-center justify-between gap-2">
                     <span className="text-sm text-muted-foreground font-medium">Fill Style</span>
                     <FillStyleOption debounceMs={debounceMs} standalone />
                  </div>
               }
            </div>

            {activeShape.type !== "text" && activeShape.type !== "group" &&
               <div className="flex flex-col gap-4">
                  <div className="w-full flex flex-col gap-2">
                     <span className="text-sm text-muted-foreground font-medium">Stroke Width</span>
                     <StrokeSize className="flex items-center gap-2" debounceMs={debounceMs} standalone />
                  </div>

                  <div className="w-full flex flex-col gap-2">
                     <span className="text-sm text-muted-foreground font-medium">Stroke Style</span>
                     <StrokeDash debounceMs={debounceMs} className="flex" standalone />
                  </div>

                  <div className="w-full flex flex-col gap-2">
                     <span className="text-sm text-muted-foreground font-medium">Roughness</span>
                     <RoughnessOption debounceMs={debounceMs} standalone />
                  </div>
               </div>
            }
            {activeShape.get("text")?.length > 0 &&
               <div className="flex flex-col gap-3">
                  <span className="text-sm text-muted-foreground font-medium pb-1">Typography</span>
                  <div className="w-full flex flex-col gap-3">
                     <FontFamilyOption className="flex" debounceMs={debounceMs} />
                     <FontSizes className="flex items-center gap-1" debounceMs={debounceMs} standalone />
                     <div className="flex items-center justify-between">
                        <div className="flex bg-muted/50 rounded-md border p-0.5">
                           <BoldOption debounceMs={debounceMs} />
                           <ItalicOption debounceMs={debounceMs} />
                        </div>
                        <AlignOptions debounceMs={debounceMs} />
                        <VerticalAlignOptions debounceMs={debounceMs} />
                     </div>
                  </div>
               </div>
            }

            <div className="flex flex-col gap-3">
               <span className="text-sm text-muted-foreground font-medium pb-1">Transform</span>
               <div className="w-full flex flex-col gap-2">
                  <RotationOption debounceMs={debounceMs} standalone />
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-sm text-muted-foreground font-medium pb-1">Actions</span>
               <div className="flex mt-2 gap-1">
                  <ZOrderButtons className="flex gap-1" debounceMs={debounceMs} />
                  <DuplicateOption />
                  <DeleteOption />
               </div>
            </div>
         </div>
      </div>
   );

   return (
      <div className="absolute left-[1em] top-[4em] z-[10] pointer-events-auto bg-background border rounded-md">
         <Content />
      </div>
   );
}
