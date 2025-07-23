import {
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

function ShapeOptions() {
   const { activeShape, canvas } = useBoard();

   return (
      <div className="flex bg-background divide-x gap-2 p-1 items-center rounded-sm border border-muted shadow shadow-foreground/5">
         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  <ShapesIcon width={14} />
               </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1"></PopoverContent>
         </Popover>

         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  <PaintBucket width={14} />
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
            <TrashIcon width={14} />
         </button>

         <StrokeDash />

         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  {activeShape?.get("fontSize")}
               </button>
            </PopoverTrigger>
            <PopoverContent
               className="w-fit p-1 flex flex-col"
               onClick={(e) => {
                  if (!activeShape) return;
                  const target = e.target as HTMLElement;
                  const size = Number(target.getAttribute("data-size"));
                  if (isNaN(size)) return;

                  activeShape.set("fontSize", size);
                  canvas?.render();
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

         <div className="flex items-center">
            <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
               <BoldIcon width={14} />
            </button>
            <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
               <ItalicIcon width={14} />
            </button>
         </div>
      </div>
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
            <Circle width={14} />
         </button>
         <button
            onClick={() => {
               handledash([5, 5]);
            }}
            className={cn(
               s === "5,5" ? "text-foreground" : "text-muted",
               "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
            )}>
            <CircleDashed width={14} />
         </button>
      </div>
   );
}

export default ShapeOptions;
