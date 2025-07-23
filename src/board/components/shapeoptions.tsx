import {
   BoldIcon,
   Circle,
   CircleDashed,
   DeleteIcon,
   ItalicIcon,
   PaintBucket,
   ShapesIcon,
   TrashIcon,
} from "lucide-react";
import { useBoard } from "../board_provider";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";

function ShapeOptions() {
   const { activeShape } = useBoard();

   return (
      <div className="flex bg-background divide-x gap-2 p-1 items-center rounded-sm border border-muted shadow shadow-foreground/5">
         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={
                     "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
                  }
               >
                  <ShapesIcon width={14} />
               </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1">Color</PopoverContent>
         </Popover>

         <Popover>
            <PopoverTrigger asChild>
               <button
                  className={
                     "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
                  }
               >
                  <PaintBucket width={14} />
               </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1">Color</PopoverContent>
         </Popover>

         <button
            className={
               "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
            }
         >
            <TrashIcon width={14} />
         </button>

         <div className="flex">
            <button
               className={
                  "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
               }
            >
               <CircleDashed width={14} />
            </button>
            <button
               className={
                  "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
               }
            >
               <Circle width={14} />
            </button>
         </div>

         <button
            className={
               "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
            }
         >
            <span>Medium</span>
         </button>

         <div className="flex items-center">
            <button
               className={
                  "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
               }
            >
               <BoldIcon width={14} />
            </button>
            <button
               className={
                  "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
               }
            >
               <ItalicIcon width={14} />
            </button>
         </div>
      </div>
   );
}

export default ShapeOptions;
