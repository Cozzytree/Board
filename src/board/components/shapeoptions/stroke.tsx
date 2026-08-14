import { useState } from "react";
import { COLOR_PALETTE, generateShades, type Props } from "./utils";
import ActiveSelection from "@/board/shapes/active_selection";
import { cn, debounce } from "@/lib/utils";
import { useBoard } from "../../board-context";
import { PenIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLORS } from "@/board/constants";

export default function StrokeOption({ debounceMs = 200, className, standalone = false, icon, mobile = false }: Props & { mobile?: boolean }) {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const [shade, setShade] = useState(0);
  const applyStrokeSync = (val: string) => {

    if (canvas) canvas.defaultShapeProps.stroke = val;
    if (!activeShape) { update(); return; }

    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("stroke", val);
      });
    }
    activeShape.set("stroke", val);

    const ac = canvas?.getActiveShapes();
    if (ac) setActiveShape(ac);
    canvas?.render();
    update();
  };
  const applyStroke = debounce(applyStrokeSync, debounceMs);

  const content = () => {
    const activeShade = generateShades((activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke) || "");
    return (
      <div className="flex flex-col w-32 space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground w-12">Colors</span>
          <div className="grid grid-cols-5 gap-1"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target) return;
              const attr = target.closest("[data-cc]")
              if (!attr) return;
              const c = attr.getAttribute("data-cc")
              if (c) {
                applyStrokeSync(c);
              }
            }}
          >
            {COLOR_PALETTE.map((shades, colIndex) => {
              const c = shades[shade];
              return (
                <button
                  data-cc={c}
                  key={`${colIndex}-${shade}`}
                  style={{ background: c }}
                  title={c}
                  className={cn(
                    "h-5 w-5 border border-border/70 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    (activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke) === c ? "ring-2 ring-primary bg-primary/10 border-primary" : "",
                  )}
                />
              );
            })}
          </div>
        </div>

        <div
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target) return;
            const attr = target.closest("[data-shade]")
            if (!attr) return;
            const c = Number(attr.getAttribute("data-shade"))
            if (!isNaN(c)) {
              setShade(c)
            }
          }}
          className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground w-12">Shades</span>
          <div className="flex item-center gap-1">
            {[4, 3, 2, 1, 0].map((s) => {
              return (
                <button data-shade={s}>
                  <div style={{ background: activeShade[s] }} className="w-5 h-5" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-muted-foreground w-12">Hexcode</span>
          <div className="flex items-center gap-2">
            <Input
              className="text-sm text-muted-foreground"
              type="text"
              defaultValue={activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke}
            />
            <div className="relative h-6 w-6 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:scale-110 transition-transform">
              <Label htmlFor="cst-c">
                <PenIcon width={13} />
              </Label>
              <input
                id="cst-c"
                type="color"
                className="hidden inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                value={(activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke) || "#000000"}
                onChange={(e) => {
                  if (!activeShape) return;
                  applyStroke(e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {standalone === true ?
        <>
          {content()}
        </>
        :
        <div className={cn("w-fit flex justify-between items-center", className)}>
          {!mobile &&
            <div onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target) return;
              const attr = target.closest("[data-cc]")
              if (!attr) return;
              const c = attr.getAttribute("data-cc")
              if (c) {
                applyStrokeSync(c);
              }
            }}
              className="flex items-center gap-0.5">
              {COLORS.slice(0, 4).map((c) =>
                <button data-cc={c}>
                  <div className="w-5 h-5" style={{ background: c }} />
                </button>
              )}
            </div>
          }
          <Popover>
             <PopoverTrigger asChild className="w-fit">
              <button className={"relative w-fit"}>
                {icon ||
                  <div
                    className="bottom-1 right-1 w-6 h-6 rounded-sm"
                    style={{ background: (activeShape ? activeShape.get("stroke") : canvas?.defaultShapeProps.stroke) || "currentColor" }}
                  />
                }
              </button>
            </PopoverTrigger>
            <PopoverContent className={"w-fit p-3"}>
              {content()}
            </PopoverContent>
          </Popover>
        </div>
      }
    </>
  );
}
