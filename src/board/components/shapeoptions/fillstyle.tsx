import ActiveSelection from "@/board/shapes/active_selection";
import { useBoard } from "../../board-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlignLeftIcon, HashIcon, Square } from "lucide-react";
import { OptionWrapper, type Props } from "./utils";

export default function FillStyleOption({ className, standalone, children }: Props) {
  const { activeShape, canvas, update } = useBoard();
  const activeFillStyle = (activeShape ? activeShape.get("fillStyle") : canvas?.defaultShapeProps.fillStyle) ?? "hachure";
  const handleSetFillStyle = (v: string) => {

    if (canvas) canvas.defaultShapeProps.fillStyle = v;
    if (!activeShape) { update(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        s.s.set("fillStyle", v);
      });
    } else {
      activeShape.set("fillStyle", v);
    }
    canvas?.render();
    update();
  };

  const content = (
    <>
      <div className="flex gap-1">
        <Button
          variant={activeFillStyle === "hachure" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetFillStyle("hachure")}
          title="Hachure"
          className={cn("h-8 w-8 p-0", activeFillStyle === "hachure" && "bg-secondary text-secondary-foreground")}>
          <AlignLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeFillStyle === "cross-hatch" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetFillStyle("cross-hatch")}
          title="Cross-Hatch"
          className={cn("h-8 w-8 p-0", activeFillStyle === "cross-hatch" && "bg-secondary text-secondary-foreground")}>
          <HashIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeFillStyle === "solid" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetFillStyle("solid")}
          title="Solid"
          className={cn("h-8 w-8 p-0", activeFillStyle === "solid" && "bg-secondary text-secondary-foreground")}>
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    </>
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={
        <div className="flex h-6 w-6 items-center justify-center rounded border bg-muted/50 transition-colors hover:bg-muted" title="Fill Style">
          {activeFillStyle === "solid" ? (
            <Square className="h-3 w-3 fill-current" />
          ) : activeFillStyle === "cross-hatch" ? (
            <HashIcon className="h-3 w-3" />
          ) : (
            <AlignLeftIcon className="h-3 w-3" />
          )}
        </div>
      }
      children={children}
      className={className}
      content={content}
    />
  );
}
