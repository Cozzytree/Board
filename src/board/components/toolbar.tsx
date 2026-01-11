import { useBoard } from "../board_provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export default function Toolbar() {
  const { mode, setMode, tools } = useBoard();

  return (
    <div className="flex bg-background gap-1 p-1 items-center rounded-sm border border-muted shadow">
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
                  mode.m === t.mode ? "bg-primary text-background" : "hover:bg-foreground/10",
                  "py-[0.2em] px-[0.4em] rounded-sm",
                )}>
                <ShowIcon I={t.I} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              className="w-fit grid grid-cols-3 place-items-center p-1 gap-[0.2em] bg-background items-center rounded-xs border border-muted shadow">
              {t.subMode.map((sm, index) => (
                <div key={index} className="w-fit">
                  <button
                    className={cn(
                      mode.sm === sm.sm ? "bg-primary text-background" : "hover:bg-foreground/10",
                      "py-[0.2em] px-[0.5em] rounded-sm cursor-pointer w-7 g-7 md:w-8 md:h-8 flex justify-center items-center",
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
    return <img src={I} alt={I} loading="lazy" width={18} />;
  } else {
    return <I className="w-3 md:w-4" />;
  }
}
