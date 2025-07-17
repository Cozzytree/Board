import { Button } from "@/components/ui/button";
import { useBoard } from "../board_provider";
import type { modes, submodes } from "../types";
import {
   BoxIcon,
   BrushIcon,
   CircleIcon,
   GrabIcon,
   PencilIcon,
   PentagonIcon,
   PointerIcon,
   ShapesIcon,
   TriangleIcon,
   type LucideIcon,
} from "lucide-react";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";

const tools: {
   mode: modes;
   I: LucideIcon;
   subMode: { sm: submodes; I: LucideIcon }[];
}[] = [
   {
      mode: "cursor",
      I: PointerIcon,
      subMode: [
         { sm: "free", I: PointerIcon },
         { sm: "grab", I: GrabIcon },
      ],
   },
   {
      mode: "shape",
      I: ShapesIcon,
      subMode: [
         { sm: "circle", I: CircleIcon },
         { sm: "rect", I: BoxIcon },
         { sm: "path:pentagon", I: PentagonIcon },
         { sm: "path:triangle", I: TriangleIcon },
      ],
   },

   { mode: "draw", I: BrushIcon, subMode: [{ sm: "pencil", I: PencilIcon }] },
];

export default function Toolbar() {
   const { mode, setMode } = useBoard();

   return (
      <div className="flex items-center">
         {tools.map((t, i) => (
            <div key={i}>
               <Popover>
                  <PopoverTrigger asChild>
                     <Button
                        variant={mode.m == t.mode ? "default" : "ghost"}
                        onClick={() => {
                           if (mode.m === t.mode) return;
                           setMode(t.mode, t.subMode[0].sm);
                        }}
                     >
                        <t.I width={20} />
                     </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-fit grid grid-cols-4 p-1 gap-2 flex-wrap">
                     {t.subMode.map((sm, index) => (
                        <div key={index} className="">
                           <Button
                              onClick={() => {
                                 if (mode.sm == sm.sm) return;
                                 setMode(t.mode, sm.sm);
                              }}
                              size={"icon"}
                              variant={sm.sm == mode.sm ? "default" : "outline"}
                           >
                              <sm.I width={16} />
                           </Button>
                        </div>
                     ))}
                  </PopoverContent>
               </Popover>
            </div>
         ))}
      </div>
   );
}
