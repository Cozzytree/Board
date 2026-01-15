import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BoldIcon,
  BrushIcon,
  Circle,
  CircleDashed,
  GroupIcon,
  ItalicIcon,
  MenuIcon,
  Minus,
  PaintBucket,
  TrashIcon,
  UngroupIcon,
} from "lucide-react";
import { useBoard } from "../board_provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLORS, FONT_SIZES, strokeSize } from "../constants";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { textAlign } from "../types";
import { helperEvent } from "../utils/utilfunc";
import { useMobile } from "@/hooks/use-mobile";
import ActiveSelection from "../shapes/active_selection";
import { Button } from "@/components/ui/button";

function ShapeOptions() {
  const { activeShape, canvas, setActiveShape } = useBoard();
  const isMobile = useMobile();

  return (
    <>
      {isMobile ? (
        <div className="fixed right-5 bottom-5 z-50">
          <Popover>
            <PopoverTrigger asChild>
              <Button className="cursor-pointer shadow" variant={"secondary"} size={"xs"}>
                <MenuIcon className="w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-1">
              <div className="grid grid-cols-3">
                <FillOption />
                <StrokeOption />
                <StrokeDash />
                <FontSizes />
                <button
                  onClick={() => {
                    if (!activeShape || !canvas) return;
                    canvas.removeShape(activeShape);
                    setActiveShape(null);
                  }}
                  className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
                  <TrashIcon className="w-3 md:w-4" />
                </button>

                <StrokeSize />

                <BoldOption />
                <ItalicOption />

                <AlignOptions />

                {activeShape?.type === "line" && <ArrowOption />}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="z-50 fixed top-3 md:top-5 left-1/2 -translate-x-[50%]">
          <div className="flex bg-background divide-x gap-0 md:gap-1 p-0 md:p-1 items-center rounded-sm border border-muted shadow shadow-foreground/5">
            <FillOption />
            <StrokeOption />

            <button
              onClick={() => {
                if (!activeShape || !canvas) return;
                canvas.removeShape(activeShape);
                setActiveShape(null);
              }}
              className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
              <TrashIcon className="w-3 md:w-4" />
            </button>

            {/*stroke size*/}
            <StrokeSize />

            <StrokeDash />

            <FontSizes />

            <div className="flex items-center">
              <BoldOption />
              <ItalicOption />
            </div>

            <AlignOptions />

            {activeShape?.type === "group" && (
              <>
                <GroupIcon />
                <UngroupIcon />
              </>
            )}

            {activeShape?.type === "line" && <ArrowOption />}
          </div>
        </div>
      )}
    </>
  );
}

function ArrowOption() {
  const { activeShape, setActiveShape, canvas } = useBoard();

  const handleArrow = (side: 0 | 1) => {
    if (!activeShape || !canvas) return;

    if (side == 0) {
      activeShape.set("arrowS", !activeShape.get("arrowS"));
    } else {
      activeShape.set("arrowE", !activeShape.get("arrowE"));
    }

    setActiveShape(activeShape);
    canvas.render();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "py-[0.25em] text-sm px-[0.3em] w-7 flex justify-center items-center cursor-pointer rounded-sm hover:bg-foreground/10"
          }>
          <ArrowLeftRightIcon className="w-3 md:w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-1 flex items-center gap-1">
        <button
          onClick={() => handleArrow(0)}
          className={`${activeShape?.get("arrowS") ? "text-foreground" : "text-muted"} py-[0.25em] text-sm px-[0.3em] w-7 flex justify-center items-center cursor-pointer rounded-sm hover:bg-foreground/10`}>
          <ArrowLeftIcon className="w-3 md:w-4" />
        </button>
        <button
          onClick={() => handleArrow(1)}
          className={`${activeShape?.get("arrowE") ? "text-foreground" : "text-muted"} py-[0.25em] text-sm px-[0.3em] w-7 flex justify-center items-center cursor-pointer rounded-sm hover:bg-foreground/10`}>
          <ArrowRightIcon className="w-3 md:w-4" />
        </button>
      </PopoverContent>
    </Popover>
  );
}

function StrokeSize() {
  const { activeShape, canvas, setActiveShape } = useBoard();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={"py-[0.25em] text-sm px-[0.1em] rounded-sm hover:bg-foreground/10"}>
          <Minus />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onClick={(e) => {
          if (!activeShape) return;
          helperEvent(e, "data-stroke", (val) => {
            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((s) => {
                if (s.s) s.s.set("strokeWidth", val);
              });
            }
            activeShape.set("strokeWidth", val);
            const ac = canvas?.getActiveShapes();
            if (ac) {
              setActiveShape(ac);
            }
            canvas?.render();
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
  );
}

function StrokeOption() {
  const { activeShape, canvas, setActiveShape } = useBoard();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10 flex justify-center items-center"
          }>
          <BrushIcon fill={activeShape?.get("stroke")} className="w-3 md:w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onClick={(e) => {
          if (!activeShape) return;
          helperEvent(e, "data-s-color", (val) => {
            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((s) => {
                if (s.s) s.s.set("stroke", val);
              });
            }
            activeShape.set("stroke", val);

            const ac = canvas?.getActiveShapes();
            if (ac) {
              setActiveShape(ac);
            }
            canvas?.render();
          });
        }}
        className="w-fit p-1 grid grid-cols-4 gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            data-s-color={c}
            style={{ background: c }}
            className={"py-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs"}></button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function FillOption() {
  const { activeShape, canvas, setActiveShape } = useBoard();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          style={{
            background: activeShape?.get("fill") || "",
          }}
          className={
            "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10 flex justify-center items-center"
          }>
          <PaintBucket className="w-3 md:w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        onClick={(e) => {
          if (!activeShape) return;
          helperEvent(e, "data-color", (color) => {
            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((s) => {
                if (s.s) s.s.set("fill", color);
              });
            }
            activeShape.set("fill", color);
            const ac = canvas?.getActiveShapes();
            if (ac) {
              setActiveShape(ac);
            }
            canvas?.render();
          });
        }}
        className="w-fit p-1 grid grid-cols-4 gap-1 z-50">
        {COLORS.map((c) => (
          <button
            key={c}
            data-color={c}
            style={{ background: c }}
            className={"py-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs"}></button>
        ))}
        <button
          data-color={"#00000000"}
          style={{ background: "#00000000" }}
          className={"relativepy-[0.25em] h-6 w-6 text-sm px-[0.6em] rounded-xs border"}></button>
      </PopoverContent>
    </Popover>
  );
}

function ItalicOption() {
  const { activeShape, canvas, setActiveShape } = useBoard();
  const [isItalic, setItalic] = useState(!!activeShape?.get("italic"));
  return (
    <button
      className={`${isItalic ? "bg-muted" : "bg-none"} py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10`}>
      <ItalicIcon
        onClick={() => {
          if (!canvas || !activeShape) return;
          if (activeShape instanceof ActiveSelection) {
            activeShape.shapes.forEach((s) => {
              if (s.s) s.s.set("italic", !isItalic);
            });
          }
          activeShape?.set("italic", !isItalic);
          setItalic(!isItalic);

          setActiveShape(activeShape);
          canvas.render();
        }}
        className="w-3 md:w-4"
      />
    </button>
  );
}

function AlignOptions() {
  const { activeShape, canvas } = useBoard();
  const [allign, setAllign] = useState((activeShape?.get("textAlign") as textAlign) || "center");

  const handleAlign = (a: textAlign) => {
    if (!activeShape || !canvas) return;
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("textAlign", a);
      });
    }
    activeShape.set("textAlign", a);
    canvas.render();
    setAllign(a);
  };

  const allignIcon = () => {
    switch (allign) {
      case "left":
        return <AlignLeftIcon className="w-3" />;
      case "center":
        return <AlignCenterIcon className="w-3" />;
      case "right":
        return <AlignRightIcon className="w-3" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10 flex justify-center items-center"
          }>
          {allignIcon()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1">
        <div
          className="flex items-center"
          onClick={(e) => {
            const target = (e.target as HTMLElement).closest("[data-align]") as HTMLElement;
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
      </PopoverContent>
    </Popover>
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
  const [size, setSize] = useState(FONT_SIZES.find((f) => f.size === activeShape?.get("fontSize")));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={"py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10"}>
          <span className="font-bold">{size && size.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-1 flex flex-col"
        onClick={(e) => {
          if (!activeShape || !canvas) return;
          helperEvent(e, "data-size", (size) => {
            if (isNaN(size)) return;
            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((s) => {
                if (s.s) s.s.set("fontSize", size);
              });
            }
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
              activeShape?.get("fontSize") === f.size
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground",
              "py-[0.25em] text-sm px-[0.5em] rounded-sm hover:bg-foreground/10 cursor-pointer",
            )}>
            <span className="font-bold">{f.label}</span>
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
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("dash", v);
      });
    }
    activeShape?.set("dash", v);
    canvas?.render();
    setActiveShape(activeShape);
    setS(activeShape?.get("dash").toString());
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "py-[0.25em] text-sm px-[0.6em] rounded-sm hover:bg-foreground/10 flex justify-center items-center"
          }>
          {s == "0,0" ? <Circle width={10} /> : <CircleDashed width={10} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1" side="top">
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
      </PopoverContent>
    </Popover>
  );
}

export default ShapeOptions;
