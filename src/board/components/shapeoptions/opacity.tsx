import ActiveSelection from "@/board/shapes/active_selection";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";
import { SquareIcon } from "lucide-react";
import { OptionWrapper, type Props } from "./utils";
import { useBoard } from "@/lib";

export default function OpacityOption({ debounceMs = 100, className, standalone = false, children, icon }: Props) {
  const { activeShape, canvas } = useBoard();

  const handleSetOpacity = debounce((v: number) => {
    if (!activeShape || !canvas) return;
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        s.s.set("opacity", v);
      })
    } else {
      activeShape.set("opacity", v);
    }
    canvas.render();
  }, debounceMs)

  const defaultVal = parseInt(activeShape?.get("opacity")) ?? 0;
  const content = (
    <Input defaultValue={defaultVal * 100} type="range" max={100} min={0} step={100 / 10} onChange={(e) => {
      const num = Number(e.target.value);
      if (isNaN(num)) return;
      handleSetOpacity(num / 100)
    }}
    />
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={icon || <SquareIcon opacity={0.5} />}
      children={children}
      className={className}
      content={content}
    />
  );
}
