import { AlignOptions, BoldOption, DeleteOption, DuplicateOption, FillOption, FillStyleOption, FontFamilyOption, FontSizes, ItalicOption, OpacityOption, RotationOption, RoughnessOption, StrokeDash, StrokeOption, StrokeSize, VerticalAlignOptions, ZOrderButtons } from "@/board/components/shapeoptions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBoard } from "@/lib";
import { ScrollArea } from "./ui/scroll-area";

export default function ExcalidrawOptionsPanel() {
   const isMobile = useIsMobile();
   const { activeShape, isMinimal } = useBoard();
   const debounceMs = 200;

   if (isMinimal || !activeShape) return null;

   if (isMobile) {
      return (
         <div className="absolute left-0 bottom-20 h-8 w-full px-4 z-[999] pointer-events-auto flex justify-center">
            <div className="flex flex-row overflow-x-auto gap-2 p-2 max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
               <StrokeOption debounceMs={debounceMs} className="z-[9999]" mobile />
               <FillOption debounceMs={debounceMs} className="z-[9999]" mobile/>
               <OpacityOption debounceMs={debounceMs} className="z-[9999]" />
               <StrokeSize debounceMs={debounceMs} className="z-[9999] flex gap-1" />
               <StrokeDash debounceMs={debounceMs} className="z-[9999]" />
               <RoughnessOption debounceMs={debounceMs} className="z-[9999]" />
               <FillStyleOption debounceMs={debounceMs} className="z-[9999]" />
               <FontFamilyOption debounceMs={debounceMs} className="z-[9999]" />
               <FontSizes debounceMs={debounceMs} className="z-[9999]" />
               <div className="flex items-center border rounded-md ml-2 mr-2">
                  <BoldOption debounceMs={debounceMs} />
                  <ItalicOption debounceMs={debounceMs} />
               </div>
               <AlignOptions debounceMs={debounceMs} />
               <VerticalAlignOptions debounceMs={debounceMs} />
               <RotationOption debounceMs={debounceMs} className="z-[9999]" />
               <div className="flex items-center border rounded-md ml-2">
                  <ZOrderButtons debounceMs={debounceMs} />
               </div>
            </div>
         </div>
      );
   }

   const Content = () => (
      <ScrollArea className="h-full p-4">
         <div className="flex max-h-[80vh] flex-col gap-5 w-72 pointer-events-auto">
            <div className="flex flex-col gap-3">
               <div className="w-full flex flex-col justify-between items-start">
                  <span className="text-sm text-muted-foreground font-medium">Stroke</span>
                  <StrokeOption debounceMs={debounceMs}/>
               </div>
               <div className="w-full flex flex-col justify-between items-start">
                  <span className="text-sm text-muted-foreground font-medium">Background</span>
                  <FillOption debounceMs={debounceMs} />
               </div>
            </div>

            <div className="flex flex-col gap-4">
               <div className="w-full flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Opacity</span>
                  <OpacityOption debounceMs={debounceMs} standalone />
               </div>
               <div className="w-full flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Fill Style</span>
                  <FillStyleOption debounceMs={debounceMs} standalone />
               </div>
            </div>

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
            {activeShape.get("text")?.length > 0 &&
               <div className="flex flex-col gap-3">
                  <span className="text-sm text-muted-foreground font-medium pb-1">Typography</span>
                  <div className="w-full flex flex-col gap-3">
                     <FontFamilyOption className="flex" debounceMs={debounceMs} standalone />
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
      </ScrollArea>
   );

   return (
      <div className="absolute left-[1em] top-[4em] z-[10] pointer-events-auto bg-background border rounded-md">
         <Content />
      </div>
   );
}
