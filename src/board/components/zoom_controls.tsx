import { PlusIcon, MinusIcon } from "lucide-react";
import { useBoard } from "../board-context";
import { Button } from "@/components/ui/button";

export function BoardZoomControls() {
   const { zoom, handleZoom } = useBoard();

   return (
      <div className="flex bg-muted items-center gap-2 p-1 rounded-md border space-x-2">
         <button
            onClick={() => {
               handleZoom(true);
            }}
            className="cursor-pointer">
            <PlusIcon className="w-3.5 h-3.5"/>
         </button>
         <span className="text-xs">{zoom.toFixed(0)} %</span>
         <button
            onClick={() => {
               handleZoom(false);
            }}
            className="cursor-pointer">
            <MinusIcon className="w-3.5 h-3.5" />
         </button>
      </div>
   );
}
