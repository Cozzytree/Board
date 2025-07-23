import { useBoard } from "../board_provider";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function Toolbar() {
   const { mode, setMode, tools } = useBoard();

   return (
      <div className="flex flex-col bg-background gap-1 p-1 items-center rounded-sm border border-muted shadow">
         {tools.map((t, i) => (
            <div
               onClick={(e) => {
                  const target = e.target as HTMLElement;
                  // if (e.target.container)
               }}
               key={i}
               className="flex items-center"
            >
               <Popover>
                  <PopoverTrigger asChild>
                     <button
                        onClick={() => {
                           if (mode.m === t.mode) return;
                           setMode(t.mode, t.subMode[0].sm);
                        }}
                        className={cn(
                           mode.m === t.mode
                              ? "bg-primary text-background"
                              : "hover:bg-foreground/10",
                           "py-[0.25em] px-[0.4em] rounded-sm",
                        )}
                     >
                        <t.I width={17} />
                     </button>
                  </PopoverTrigger>
                  <PopoverContent
                     side="left"
                     className="w-fit flex flex-col bg-background gap-1 p-1 items-center rounded-xs border border-muted shadow"
                  >
                     {t.subMode.map((sm, index) => (
                        <div key={index} className="">
                           <button
                              className={cn(
                                 mode.sm === sm.sm
                                    ? "bg-primary text-background"
                                    : "hover:bg-foreground/10",
                                 "py-[0.25em] px-[0.4em] rounded-sm",
                              )}
                              onClick={() => {
                                 if (mode.sm == sm.sm) return;
                                 setMode(t.mode, sm.sm);
                              }}
                           >
                              <sm.I width={16} />
                           </button>
                        </div>
                     ))}
                  </PopoverContent>
               </Popover>
            </div>
         ))}
      </div>
   );
}
