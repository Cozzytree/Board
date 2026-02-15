import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BoldIcon,
  BrushIcon,
  CheckIcon,
  Circle,
  CircleDashed,
  GroupIcon,
  ItalicIcon,
  MenuIcon,
  Minus,
  PaintBucket,
  TrashIcon,
  UngroupIcon,
  RotateCwIcon,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignVerticalJustifyCenter,
} from "lucide-react";
import { useBoard } from "../board-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLORS, FONT_SIZES, strokeSize } from "../constants";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { textAlign } from "../types";
import { helperEvent } from "../utils/utilfunc";
import { useMobile } from "@/hooks/use-mobile";
import ActiveSelection from "../shapes/active_selection";
import { Button } from "@/components/ui/button";

function ShapeOptions() {
  const { activeShape, canvas, setActiveShape } = useBoard();
  const isMobile = useMobile();

  const handleDelete = () => {
    if (!activeShape || !canvas) return;
    canvas.removeShape(activeShape);
    setActiveShape(null);
  };

  const Content = () => (
    <>
      <FillOption />
      <StrokeOption />
      <StrokeSize />
      <StrokeDash />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <FontSizes />
      <div className="flex items-center gap-1">
        <BoldOption />
        <ItalicOption />
      </div>
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <RotationOption />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <AlignOptions />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <VerticalAlignOptions />

      {(activeShape?.type === "group" || activeShape instanceof ActiveSelection) && (
        <div className="flex items-center gap-1">
          <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
          {activeShape instanceof ActiveSelection ? (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", isMobile && "h-7 w-7")}
              onClick={() => {
                // Group logic here if implemented, or just placeholder
              }}
            >
              <GroupIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", isMobile && "h-7 w-7")}
              onClick={() => {
                // Ungroup logic here
              }}
            >
              <UngroupIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
            </Button>
          )}
        </div>
      )}


      {activeShape?.type === "line" && (
        <>
          <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
          <ArrowOption />
        </>
      )}

      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10", isMobile && "h-7 w-7")}
        onClick={handleDelete}
      >
        <TrashIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed right-5 bottom-20 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button className="shadow-lg rounded-full h-12 w-12" variant="default" size="icon">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit p-2 mb-2 mr-2" side="left" align="end">
            <div className="flex flex-wrap gap-2 max-w-[250px] justify-center">
              <Content />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="z-50 fixed top-6 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-1 p-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg">
        <Content />
      </div>
    </div>
  );
}

function ArrowOption() {
  const { activeShape, setActiveShape, canvas } = useBoard();
  const isMobile = useMobile();

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
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", isMobile && "h-7 w-7")}>
          <ArrowLeftRightIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-2" sideOffset={5}>
        <div className="flex items-center gap-2">
          <Button
            variant={activeShape?.get("arrowS") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleArrow(0)}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={activeShape?.get("arrowE") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleArrow(1)}
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StrokeSize() {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const isMobile = useMobile();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", isMobile && "h-7 w-7")}>
          <Minus className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} style={{ transform: `scaleY(${Math.min(Math.max((activeShape?.get("strokeWidth") || 1) * 0.5, 1), 3)})` }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={5}
        className="w-fit p-2"
      >
        <div className="flex flex-col gap-1">
          {strokeSize.map((s) => (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md hover:bg-muted transition-colors",
                activeShape?.get("strokeWidth") === s ? "bg-muted" : ""
              )}
              onClick={() => {
                if (!activeShape) return;
                // Manual event simulation for helperEvent or direct logic
                if (activeShape instanceof ActiveSelection) {
                  activeShape.shapes.forEach((sh) => {
                    if (sh.s) sh.s.set("strokeWidth", s);
                  });
                }
                activeShape.set("strokeWidth", s);
                const ac = canvas?.getActiveShapes();
                if (ac) setActiveShape(ac);
                canvas?.render();
                update();
              }}
            >
              <div className="w-4 flex justify-center">
                {activeShape?.get("strokeWidth") === s && <CheckIcon className="h-3 w-3" />}
              </div>
              <div className="h-px bg-foreground w-12" style={{ height: s }} />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StrokeOption() {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const isMobile = useMobile();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8 relative", isMobile && "h-7 w-7")}>
          <BrushIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
          <div
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background"
            style={{ background: activeShape?.get("stroke") || "currentColor" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div
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
              update();
            });
          }}
          className="grid grid-cols-6 gap-1.5 place-items-center">
          <div className="relative h-6 w-6 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:scale-110 transition-transform">
            <input
              type="color"
              className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
              value={activeShape?.get("stroke") || "#000000"}
              onChange={(e) => {
                if (!activeShape) return;
                const val = e.target.value;
                if (activeShape instanceof ActiveSelection) {
                  activeShape.shapes.forEach((s) => {
                    if (s.s) s.s.set("stroke", val);
                  });
                }
                activeShape.set("stroke", val);
                const ac = canvas?.getActiveShapes();
                if (ac) setActiveShape(ac);
                canvas?.render();
              }}
            />
          </div>
          {COLORS.map((c) => (
            <button
              key={c}
              data-s-color={c}
              style={{ background: c }}
              className={cn(
                "h-6 w-6 rounded-md border border-border/50 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                activeShape?.get("stroke") === c ? "ring-2 ring-primary ring-offset-1" : ""
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FillOption() {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const isMobile = useMobile();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8 relative", isMobile && "h-7 w-7")}>
          <PaintBucket className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
          <div
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background"
            style={{ background: activeShape?.get("fill") || "transparent" }}
          />
        </Button>
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
            update();
          });
        }}
        className="w-64 p-3 z-50">
        <div className="grid grid-cols-6 gap-1.5 place-items-center">
          <div className="relative h-6 w-6 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:scale-110 transition-transform">
            <input
              type="color"
              className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
              value={activeShape?.get("fill") === "transparent" ? "#ffffff" : activeShape?.get("fill") || "#ffffff"}
              onChange={(e) => {
                if (!activeShape) return;
                const val = e.target.value;
                if (activeShape instanceof ActiveSelection) {
                  activeShape.shapes.forEach((s) => {
                    if (s.s) s.s.set("fill", val);
                  });
                }
                activeShape.set("fill", val);
                const ac = canvas?.getActiveShapes();
                if (ac) setActiveShape(ac);
                canvas?.render();
              }}
            />
          </div>
          <button
            data-color={"#00000000"}
            className={cn(
              "h-6 w-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors relative overflow-hidden",
              activeShape?.get("fill") === "transparent" || !activeShape?.get("fill")
                ? "ring-2 ring-primary ring-offset-1"
                : ""
            )}>
            <div className="absolute inset-0 bg-red-500/10 rotate-45 w-[1px] h-[200%] top-[-50%] left-1/2 -translate-x-1/2 bg-destructive/50" />
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              data-color={c}
              style={{ background: c }}
              className={cn(
                "h-8 w-8 rounded-full border border-border/50 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                activeShape?.get("fill") === c ? "ring-2 ring-primary ring-offset-2" : ""
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItalicOption() {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const [isItalic, setItalic] = useState(!!activeShape?.get("italic"));
  const isMobile = useMobile();

  return (
    <Button
      variant={isItalic ? "secondary" : "ghost"}
      size="icon"
      className={cn("h-8 w-8", isMobile && "h-7 w-7")}
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
        update();
      }}
    >
      <ItalicIcon className="h-4 w-4" />
    </Button>
  );
}

function AlignOptions() {
  const { activeShape, canvas } = useBoard();
  // const [allign, setAllign] = useState((activeShape?.get("textAlign") as textAlign) || "center");
  const isMobile = useMobile();

  const handleAlign = (a: textAlign) => {
    if (!activeShape || !canvas) return;
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("textAlign", a);
      });
    }
    activeShape.set("textAlign", a);
    canvas.render();
    // setAllign(a);
  };

  const currentAlign = activeShape?.get("textAlign") as textAlign || "center";

  return (
    <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
      <Button
        variant={currentAlign === "left" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("left")}
      >
        <AlignLeftIcon className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
      <Button
        variant={currentAlign === "center" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("center")}
      >
        <AlignCenterIcon className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
      <Button
        variant={currentAlign === "right" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("right")}
      >
        <AlignRightIcon className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
    </div>
  );
}

function BoldOption() {
  const { activeShape, canvas, update } = useBoard();
  const [w, setW] = useState((activeShape?.get("fontWeight") as number) || 500);
  const isMobile = useMobile();

  return (
    <Button
      variant={w !== 500 ? "secondary" : "ghost"}
      size="icon"
      className={cn("h-8 w-8", isMobile && "h-7 w-7")}
      onClick={() => {
        if (!activeShape || !canvas) return;
        activeShape.set("fontWeight", w === 500 ? 800 : 500);
        canvas.render();
        update();
        setW((p) => (p == 500 ? 800 : 500));
      }}
    >
      <BoldIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
    </Button>
  );
}

function FontSizes() {
  const { activeShape, canvas } = useBoard();
  const [size, setSize] = useState(FONT_SIZES.find((f) => f.size === activeShape?.get("fontSize")));
  const isMobile = useMobile();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn("h-8 px-2 min-w-[3rem] font-medium", isMobile && "h-7 text-xs")}>
          {size ? size.label : "Size"}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-32 p-1"
      >
        <div className="flex flex-col gap-0.5">
          {FONT_SIZES.map((f) => (
            <Button
              key={f.size}
              variant="ghost"
              className={cn(
                "justify-start h-8 w-full",
                activeShape?.get("fontSize") === f.size ? "bg-muted" : ""
              )}
              onClick={() => {
                if (!activeShape || !canvas) return;
                if (activeShape instanceof ActiveSelection) {
                  activeShape.shapes.forEach((s) => {
                    if (s.s) s.s.set("fontSize", f.size);
                  });
                }
                activeShape.set("fontSize", Number(f.size));
                canvas.render();
                setSize(f);
              }}
            >
              <span className="text-xs mr-auto">{f.label}</span>
              {activeShape?.get("fontSize") === f.size && <CheckIcon className="h-3 w-3" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StrokeDash() {
  const { setActiveShape, activeShape, canvas, update } = useBoard();
  const [, setS] = useState(activeShape?.get("dash").toString() || "");
  const isMobile = useMobile();

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
    update();
  };

  const currentDash = activeShape?.get("dash").toString() || "0,0";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", isMobile && "h-7 w-7")}>
          {currentDash == "0,0" ? <Circle className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} /> : <CircleDashed className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-1" side="top">
        <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
          <Button
            variant={currentDash === "0,0" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handledash([0, 0])}
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={currentDash === "5,5" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handledash([5, 5])}
          >
            <CircleDashed className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RotationOption() {
  const { activeShape, canvas, update } = useBoard();
  const isMobile = useMobile();

  const getRotation = () => {
    if (!activeShape) return 0;
    const rotation = (activeShape.rotate * 180) / Math.PI;
    return Math.round(rotation < 0 ? rotation + 360 : rotation) % 360;
  }

  const [localRotation, setLocalRotation] = useState(getRotation());

  useEffect(() => {
    setLocalRotation(getRotation());
    // eslint-disable-next-line
  }, [activeShape]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className={cn("h-8 px-2 w-20 justify-between font-medium text-xs", isMobile && "h-7 w-16 px-1")}>
          <RotateCwIcon className={cn("h-3 w-3", isMobile && "h-2.5 w-2.5")} />
          {localRotation}°
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Rotation</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              value={localRotation}
              onChange={(e) => {
                if (!activeShape || !canvas) return;
                const deg = Number(e.target.value);
                setLocalRotation(deg);

                const rad = (deg * Math.PI) / 180;

                if (activeShape instanceof ActiveSelection) {
                  activeShape.shapes.forEach(s => {
                    if (s.s) s.s.set("rotate", rad);
                  })
                }

                activeShape.set("rotate", rad);
                activeShape.setCoords();
                canvas.render();
                // update(); // Removed to prevent closing popover
              }}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">{localRotation}°</span>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {[0, 45, 90, 180].map(deg => (
              <Button
                key={deg}
                variant="outline"
                size="xs"
                className="h-6 text-[10px]"
                onClick={() => {
                  if (!activeShape || !canvas) return;
                  const rad = (deg * Math.PI) / 180;
                  if (activeShape instanceof ActiveSelection) {
                    activeShape.shapes.forEach(s => {
                      if (s.s) s.s.set("rotate", rad);
                    })
                  }
                  activeShape.set("rotate", rad);
                  activeShape.setCoords();
                  canvas.render();
                  setLocalRotation(deg);
                  update(); // Keep update here for clicks as it's a one-time event
                }}
              >
                {deg}°
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VerticalAlignOptions() {
  const { activeShape, canvas } = useBoard();
  // const [align, setAlign] = useState((activeShape?.get("verticalAlign") as "top" | "center" | "bottom") || "center");
  const isMobile = useMobile();

  const handleAlign = (a: "top" | "center" | "bottom") => {
    if (!activeShape || !canvas) return;
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("verticalAlign", a);
      });
    }
    activeShape.set("verticalAlign", a);
    canvas.render();
    // setAlign(a);
  };

  const currentAlign = activeShape?.get("verticalAlign") as "top" | "center" | "bottom" || "center";

  return (
    <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
      <Button
        variant={currentAlign === "top" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("top")}
      >
        <ArrowUpToLine className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
      <Button
        variant={currentAlign === "center" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("center")}
      >
        <AlignVerticalJustifyCenter className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
      <Button
        variant={currentAlign === "bottom" ? "secondary" : "ghost"}
        size="icon"
        className={cn("h-7 w-7 rounded-sm", isMobile && "h-6 w-6")}
        onClick={() => handleAlign("bottom")}
      >
        <ArrowDownToLine className={cn("h-3.5 w-3.5", isMobile && "h-3 w-3")} />
      </Button>
    </div>
  );
}

export default ShapeOptions;
