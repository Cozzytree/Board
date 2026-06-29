import { ArrowLeft } from "lucide-react";
import { useBoard } from "../board-context";

export function BoardCenterButton() {
   const { offset, handleCenter } = useBoard();

   if (Math.abs(offset[0]) <= 100 && Math.abs(offset[1]) <= 100) {
      return null;
   }

   return (
      <div className="w-fit h-fit">
         <button className="flex gap-2 cursor-pointer p-1 border text-muted-foreground rounded-md" onClick={handleCenter}>
            <ArrowLeft className="text-muted-foreground w-3 h-4" /> <span className="hidden md:block text-xs">Back to center</span>
         </button>
      </div>
   );
}
