import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BrushIcon,
  Circle,
  CircleDashed,
  GroupIcon,
  ItalicIcon,
  Minus,
  PaintBucket,
  TrashIcon,
  UngroupIcon,
} from "lucide-react";
import { useBoard } from "../board_provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COLORS, FONT_SIZES, strokeSize } from "../constants";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { textAlign } from "../types";
import { helperEvent } from "../utils/utilfunc";

function ShapeOptions() {
  const { activeShape, canvas, setActiveShape } = useBoard();

  return (
    <div className="flex bg-background divide-x gap-2 p-1 items-center rounded-sm border border-muted shadow shadow-foreground/5">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={
              "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
            }>
            <PaintBucket fill={activeShape?.fill} className="w-3 md:w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          onClick={(e) => {
            if (!activeShape) return;
            helperEvent(e, "data-color", (color) => {
              activeShape.set("fill", color);
              const ac = canvas?.getActiveShapes();
              if (ac?.length) {
                setActiveShape(ac[0]);
              }
              canvas?.render();
            });
          }}
          className="w-fit p-1 grid grid-cols-4 gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              data-color={c}
              style={{ background: c }}
              className={
                "py-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs"
              }></button>
          ))}
          <button
            data-color={"#00000000"}
            style={{ background: "#00000000" }}
            className={
              "relativepy-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs border"
            }></button>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            className={
              "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
            }>
            <BrushIcon
              fill={activeShape?.get("stroke")}
              className="w-3 md:w-4"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          onClick={(e) => {
            if (!activeShape) return;
            helperEvent(e, "data-s-color", (val) => {
              activeShape.set("stroke", val);
              canvas?.render();
            });
          }}
          className="w-fit p-1 grid grid-cols-4 gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              data-s-color={c}
              style={{ background: c }}
              className={
                "py-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs"
              }></button>
          ))}
        </PopoverContent>
      </Popover>

      <button
        className={
          "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
        }>
        <TrashIcon className="w-3 md:w-4" />
      </button>

      {/*stroke size*/}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={
              "py-[0.25em] text-sm px-[0.24em] rounded-sm hover:bg-foreground/10"
            }>
            <Minus />
          </button>
        </PopoverTrigger>
        <PopoverContent
          onClick={(e) => {
            if (!activeShape) return;
            helperEvent(e, "data-stroke", (val) => {
              activeShape.set("strokeWidth", val);
            });
          }}
          sideOffset={12}
          className="w-fit p-1">
          <ul className="w-16 -space-y-1">
            {strokeSize.map((s) => (
              <button
                data-stroke={s}
                key={s}
                style={{
                  height: `${s}px`,
                }}
                className={`w-full bg-foreground cursor-pointer`}
              />
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      <StrokeDash />

      <FontSizes />

      <div className="flex items-center">
        <BoldOption />
        <button
          className={`${activeShape?.italic ? "bg-muted" : "bg-none"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
          <ItalicIcon className="w-3 md:w-4" />
        </button>
      </div>

      <AlignOptions />

      {activeShape?.type === "group" && (
        <>
          <GroupIcon />
          <UngroupIcon />
        </>
      )}
    </div>
  );
}

function AlignOptions() {
  const { activeShape, canvas } = useBoard();
  const [allign, setAllign] = useState(
    (activeShape?.get("textAlign") as textAlign) || "center",
  );

  const handleAlign = (a: textAlign) => {
    if (!activeShape || !canvas) return;
    activeShape.set("textAlign", a);
    canvas.render();
    setAllign(a);
  };

  return (
    <div
      className="flex items-center"
      onClick={(e) => {
        const target = (e.target as HTMLElement).closest(
          "[data-align]",
        ) as HTMLElement;
        const a = target.getAttribute("data-align") as textAlign;
        if (!a) return;
        handleAlign(a);
      }}>
      <button
        data-align="left"
        className={`${allign === "left" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
        <AlignLeftIcon className="w-3 md:w-4" />
      </button>
      <button
        data-align="center"
        className={`${allign === "center" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
        <AlignCenterIcon className="w-3 md:w-4" />
      </button>
      <button
        data-align="right"
        className={`${allign === "right" && "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
        <AlignRightIcon className="w-3 md:w-4" />
      </button>
    </div>
  );
}

function BoldOption() {
  const { activeShape, canvas } = useBoard();
  const [w, setW] = useState((activeShape?.get("fontWeight") as number) || 500);

  return (
    <button
      onClick={() => {
        if (!activeShape || !canvas) return;
        activeShape.set("fontWeight", w === 500 ? 800 : 500);
        canvas.render();
        setW((p) => (p == 500 ? 800 : 500));
      }}
      className={`${w === 500 ? "" : "bg-muted"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
      <BoldIcon className="w-3 md:w-4" />
    </button>
  );
}

function FontSizes() {
  const { activeShape, canvas } = useBoard();
  const [size, setSize] = useState(
    FONT_SIZES.find((f) => f.size === activeShape?.get("fontSize")),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"
          }>
          {size && size.label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-1 flex flex-col"
        onClick={(e) => {
          if (!activeShape || !canvas) return;
          helperEvent(e, "data-size", (size) => {
            if (isNaN(size)) return;
            activeShape.set("fontSize", Number(size));
            canvas.render();
            setSize(() => {
              return FONT_SIZES.find((f) => f.size === Number(size));
            });
          });
        }}>
        {FONT_SIZES.map((f) => (
          <button
            data-size={f.size}
            key={f.size}
            className={cn(
              activeShape?.get("fontSize") === f.size ? "bg-foreground/10" : "",
              "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
            )}>
            {f.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function StrokeDash() {
  const { setActiveShape, activeShape, canvas } = useBoard();
  const [s, setS] = useState(activeShape?.get("dash").toString() || "");

  const handledash = (v: [number, number]) => {
    activeShape?.set("dash", v);
    canvas?.render();
    setActiveShape(activeShape);
    setS(activeShape?.get("dash").toString());
  };

  return (
    <div className="flex">
      <button
        onClick={() => {
          handledash([0, 0]);
        }}
        className={cn(
          s === "0,0" ? "text-foreground" : "text-muted",
          "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
        )}>
        <Circle className="w-3 md:w-4" />
      </button>
      <button
        onClick={() => {
          handledash([5, 5]);
        }}
        className={cn(
          s === "5,5" ? "text-foreground" : "text-muted",
          "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10",
        )}>
        <CircleDashed className="w-3 md:w-4" />
      </button>
    </div>
  );
}

export default ShapeOptions;
