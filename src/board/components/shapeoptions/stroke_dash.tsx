import ActiveSelection from "@/board/shapes/active_selection";
import { cn, debounce } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useBoard } from "../../board-context";
import { OptionWrapper, type Props } from "./utils";
import { Button } from "@/components/ui/button";
import { Circle, CircleDashed, CircleDotDashed } from "lucide-react";

export default function StrokeDash({ debounceMs = 200, className, standalone, children }: Props) {
  const { setActiveShape, activeShape, canvas, update } = useBoard();
  const currentDashState = (activeShape ? activeShape.get("dash") : canvas?.defaultShapeProps.dash)?.toString() || "0,0";
  const [, setS] = useState(currentDashState);
  useEffect(() => setS(currentDashState), [currentDashState]);
  const handleUpdate = debounce(() => update(), debounceMs);

  const handledash = (v: [number, number]) => {
    if (canvas) canvas.defaultShapeProps.dash = v;
    if (!activeShape) { handleUpdate(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("dash", v);
      });
    }
    activeShape?.set("dash", v);
    canvas?.render();
    setActiveShape(activeShape);
    setS(activeShape?.get("dash").toString());
    handleUpdate();
  };

  const currentDash = (activeShape ? activeShape.get("dash") : canvas?.defaultShapeProps.dash)?.toString() || "0,0";

  const content = (
    <div className={className}>
      <Button
        variant={currentDash === "0,0" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => handledash([0, 0])}>
        <Circle className="h-4 w-4" />
      </Button>
      <Button
        variant={currentDash === "5,5" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => handledash([5, 5])}>
        <CircleDashed className="h-4 w-4" />
      </Button>
      <Button
        variant={currentDash === "8,8" ? "secondary" : "ghost"}
        size="icon"
        className="h-8 w-8"
        onClick={() => handledash([3, 3])}>
        <CircleDotDashed />
      </Button>
    </div>
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={
        currentDash == "0,0" ? (
          <Circle className={cn("h-4 w-4")} />
        ) : (
          <CircleDashed className={cn("h-4 w-4")} />
        )
      }
      children={children}
      className={className}
      content={content}
    />
  );
}
