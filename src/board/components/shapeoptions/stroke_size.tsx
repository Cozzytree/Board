import ActiveSelection from "@/board/shapes/active_selection";
import { useBoard } from "../../board-context";
import { OptionWrapper, type Props } from "./utils";
import { strokeSize } from "@/board/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MinusIcon } from "lucide-react";

export default function StrokeSize({ className, standalone, icon, children }: Props) {
  const { activeShape, canvas, setActiveShape, update } = useBoard();

  const handleStrokeSize = (n: number) => {
    if (canvas) canvas.defaultShapeProps.strokeWidth = n;
    if (!activeShape) { update(); return; }
    // Manual event simulation for helperEvent or direct logic
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((sh) => {
        if (sh.s) sh.s.set("strokeWidth", n);
      });
    }
    activeShape.set("strokeWidth", n);
    const ac = canvas?.getActiveShapes();
    if (ac) setActiveShape(ac);
    canvas?.render();
    update();
  }

  const content = (
    <div className={"flex flex-col gap-2"}>
      <div className="flex gap-1">
        {strokeSize.map((s) => (
          <Button
            size="xs"
            variant={"ghost"}
            key={s}
            className={cn(
              "h-8 w-8 rounded-sm",
              (activeShape ? activeShape.get("strokeWidth") : (canvas?.defaultShapeProps.strokeWidth || 2)) === s ? "bg-accent/50 text-accent-foreground border-border" : "border-transparent",
            )}
            onClick={() => {
              handleStrokeSize(s);
            }}>
            <div className="bg-foreground w-4" style={{ height: s }} />
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">
          Custom
        </span>
        <Input
          onBlur={(e) => {
            if (!activeShape) return;
            const num = parseInt(e.target.value);
            // Manual event simulation for helperEvent or direct logic
            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((sh) => {
                if (sh.s) sh.s.set("strokeWidth", num);
              });
            }
            activeShape.set("strokeWidth", num);
            const ac = canvas?.getActiveShapes();
            if (ac) setActiveShape(ac);
            canvas?.render();
            update();

          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = parseInt(e.currentTarget.value);
              if (!isNaN(num) && num > 0) {
                (num);
              }
              handleStrokeSize(num);
            }
          }}
          type="number"
          defaultValue={Number(activeShape ? activeShape.get("strokeWidth") : (canvas?.defaultShapeProps.strokeWidth || 2))}
        />
      </div>
    </div>
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={
        icon ||
        <MinusIcon
          style={{
            transform: `scaleY(${Math.min(Math.max(((activeShape ? activeShape.get("strokeWidth") : canvas?.defaultShapeProps.strokeWidth) || 1) * 0.5, 1), 3)})`,
          }}
        />
      }
      children={children}
      className={className}
      content={content}
    />
  );
}
