import { useBoard } from "../board_provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export default function Toolbar() {
   const { mode, setMode, tools } = useBoard();

   return (
      <div className="flex flex-col bg-background gap-1 p-1 items-center rounded-sm border border-muted shadow">
         {tools.map((t, i) => (
            <div key={i} className="flex items-center">
               <Popover>
                  <PopoverTrigger asChild>
                     <button
                        onClick={() => {
                           if (mode.m === t.mode) return;
                           if (!t.subMode.length) {
                              setMode(t.mode, null);
                           } else setMode(t.mode, t.subMode[0].sm);
                        }}
                        className={cn(
                           mode.m === t.mode
                              ? "bg-primary text-background"
                              : "hover:bg-foreground/10",
                           "py-[0.25em] px-[0.4em] rounded-sm",
                        )}>
                        <ShowIcon I={t.I} />
                     </button>
                  </PopoverTrigger>
                  <PopoverContent
                     side="left"
                     className="w-fit flex flex-col bg-background p-1 items-center rounded-xs border border-muted shadow">
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
                              }}>
                              <ShowIcon I={sm.I} />
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

function ShowIcon({ I }: { I: LucideIcon | string }) {
   if (typeof I == "string") {
      return <img src={I} alt={I} loading="lazy" width={20} />;
   } else {
      return <I className="w-3 md:w-4" />;
   }
}
