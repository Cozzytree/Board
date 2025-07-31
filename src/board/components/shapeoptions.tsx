import {
   AlignCenterIcon,
   AlignLeftIcon,
   AlignRightIcon,
   BoldIcon,
   Circle,
   CircleDashed,
   ItalicIcon,
   PaintBucket,
   ShapesIcon,
   TrashIcon,
} from "lucide-react";
import { useBoard } from "../board_provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLORS, FONT_SIZES } from "../constants";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { textAlign } from "../types";

function ShapeOptions() {
   const { activeShape, canvas } = useBoard();

   return (
      <div className="flex bg-background divide-x gap-2 p-1 items-center rounded-sm border border-muted shadow shadow-foreground/5">
         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  <ShapesIcon className="w-3 md:w-4" />
               </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1"></PopoverContent>
         </Popover>

         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  <PaintBucket className="w-3 md:w-4" />
               </button>
            </PopoverTrigger>
            <PopoverContent
               onClick={(e) => {
                  if (!activeShape) return;
                  const target = e.target as HTMLElement;
                  const color = target.getAttribute("data-color");
                  if (color) {
                     activeShape.set("fill", color);
                     canvas?.render();
                  }
               }}
               className="w-fit p-1 grid grid-cols-4 gap-1">
               {COLORS.map((c) => (
                  <button
                     key={c}
                     data-color={c}
                     style={{ background: c }}
                     className={"py-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs"}></button>
               ))}
               <button
                  data-color={"#00000000"}
                  style={{ background: "#00000000" }}
                  className={
                     "relativepy-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs border"
                  }></button>
            </PopoverContent>
         </Popover>

         <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
            <TrashIcon className="w-3 md:w-4" />
         </button>

         <StrokeDash />

         <FontSizes />

         <div className="flex items-center">
            <BoldOption />
            <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
               <ItalicIcon className="w-3 md:w-4" />
            </button>
         </div>

         <AlignOptions />
      </div>
   );
}

function AlignOptions() {
   const { activeShape, canvas } = useBoard();
   const [allign, setAllign] = useState((activeShape?.get("textAlign") as textAlign) || "center");

   const handleAlign = (a: textAlign) => {
      if (!activeShape || !canvas) return;
      activeShape.set("textAlign", a);
      canvas.render();
      setAllign(a);
   };

   return (
      <div
         className="flex items-center"
         onClick={(e) => {
            const target = (e.target as HTMLElement).closest("[data-align]") as HTMLElement;
            const a = target.getAttribute("data-align") as textAlign;
            if (!a) return;
            handleAlign(a);
         }}>
         <button
            data-align="left"
            className={`${allign === "left" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
            <AlignLeftIcon className="w-3 md:w-4" />
         </button>
         <button
            data-align="center"
            className={`${allign === "center" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
            <AlignCenterIcon className="w-3 md:w-4" />
         </button>
         <button
            data-align="right"
            className={`${allign === "right" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
            <AlignRightIcon className="w-3 md:w-4" />
         </button>
      </div>
   );
}

function BoldOption() {
   const { activeShape, canvas } = useBoard();
   const [w, setW] = useState((activeShape?.get("fontWeight") as number) || 500);

   return (
      <button
         onClick={() => {
            if (!activeShape || !canvas) return;
            activeShape.set("fontWeight", w === 500 ? 800 : 500);
            canvas.render();
            setW((p) => (p == 500 ? 800 : 500));
         }}
         className={`${w === 500 ? "" : "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
         <BoldIcon className="w-3 md:w-4" />
      </button>
   );
}

function FontSizes() {
   const { activeShape, canvas } = useBoard();
   const [size, setSize] = useState(
      FONT_SIZES.find((f) => f.size === activeShape?.get("fontSize")),
   );

   return (
      <Popover>
         <PopoverTrigger asChild>
            <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
               {size && size.label}
            </button>
         </PopoverTrigger>
         <PopoverContent
            className="w-fit p-1 flex flex-col"
            onClick={(e) => {
               if (!activeShape || !canvas) return;
               const target = e.target as HTMLElement;
               const size = Number(target.getAttribute("data-size"));
               if (isNaN(size)) return;

               activeShape.set("fontSize", size);
               canvas.render();
               setSize(() => {
                  return FONT_SIZES.find((f) => f.size === size);
               });
            }}>
            {FONT_SIZES.map((f) => (
               <button
                  data-size={f.size}
                  key={f.size}
                  className={cn(
                     activeShape?.get("fontSize") === f.size ? "bg-foreground/10" : "",
                     "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
                  )}>
                  {f.label}
               </button>
            ))}
         </PopoverContent>
      </Popover>
   );
}

function StrokeDash() {
   const { setActiveShape, activeShape, canvas } = useBoard();
   const [s, setS] = useState(activeShape?.get("dash").toString() || "");

   const handledash = (v: [number, number]) => {
      activeShape?.set("dash", v);
      canvas?.render();
      setActiveShape(activeShape);
      setS(activeShape?.get("dash").toString());
   };

   return (
      <div className="flex">
         <button
            onClick={() => {
               handledash([0, 0]);
            }}
            className={cn(
               s === "0,0" ? "text-foreground" : "text-muted",
               "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
            )}>
            <Circle className="w-3 md:w-4" />
         </button>
         <button
            onClick={() => {
               handledash([5, 5]);
            }}
            className={cn(
               s === "5,5" ? "text-foreground" : "text-muted",
               "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
            )}>
            <CircleDashed className="w-3 md:w-4" />
         </button>
      </div>
   );
}

export default ShapeOptions;
