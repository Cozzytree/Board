import { debounce } from "@/lib/utils";
import { useBoard } from "../../board-context";
import { FONT_SIZES } from "@/board/constants";
import ActiveSelection from "@/board/shapes/active_selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionWrapper, type Props } from "./utils";

export default function FontSizes({ debounceMs = 200, className, standalone, children }: Props) {
  const { activeShape, canvas, update } = useBoard();
  const handleUpdate = debounce(() => update(), debounceMs);
  const currentSize = activeShape ? activeShape.get("fontSize") : canvas?.defaultShapeProps.fontSize;
  const matchedPreset = FONT_SIZES.find((f) => f.size === currentSize);
  const displayLabel = matchedPreset ? matchedPreset.label : currentSize || "Size";

  const handleSizeChange = (newSize: number) => {
    if (canvas) canvas.defaultShapeProps.fontSize = newSize;
    if (!activeShape) { handleUpdate(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("fontSize", newSize);
      });
    }
    activeShape.set("fontSize", newSize);
    canvas?.render();
    handleUpdate();
  };

  const content = (
    <div className={className}>
      {FONT_SIZES.map((f) => (
        <Button
          key={f.size}
          variant={null}
          size={"sm"}
          className={
            currentSize === f.size ? "bg-muted" : ""
          }
          onClick={() => handleSizeChange(f.size)}>
          <span className="text-[0.9em]">{f.label}</span>
        </Button>
      ))}
      <div className="px-1 py-1">
        <Input
          onBlur={(e) => {
            const num = parseInt(e.target.value);
            if (!isNaN(num) && num > 0) {
              handleSizeChange(num);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const num = parseInt(e.currentTarget.value);
              if (!isNaN(num) && num > 0) {
                handleSizeChange(num);
              }
            }
          }}
          type="number"
          min={1}
          defaultValue={Number(currentSize || 20)}
          className="h-7 text-xs"
          placeholder="Custom"
        />
      </div>
    </div>
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={<span className="text-xs px-1">{displayLabel}</span>}
      children={children}
      className={className}
      content={content}
    />
  );
}
