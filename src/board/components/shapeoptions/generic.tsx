import { createPortal } from "react-dom";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  BoldIcon,
  BrushIcon,
  GroupIcon,
  ItalicIcon,
  Minus,
  TrashIcon,
  UngroupIcon,
  RotateCwIcon,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignVerticalJustifyCenter,
  Sun,
  Moon,
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
  MenuIcon,
  Waves,
  LockIcon,
  UnlockIcon,
  CopyIcon,
} from "lucide-react";
import React, { useState, useEffect } from "react";

import { useBoard } from "../../board-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COLORS } from "../../constants";
import { cn } from "@/lib/utils";
import type { textAlign } from "../../types";
import { useIsMobile } from "@/hooks/use-mobile"
import ActiveSelection from "../../shapes/active_selection";
import Group from "../../shapes/group";
import { Button } from "@/components/ui/button";
import type Board from "../../board";
import type Shape from "../../shapes/shape";
import { debounce } from "@/lib/utils";

const OpacityOption = React.lazy(() => import("./opacity.tsx"));
const StrokeSize = React.lazy(() => import("./stroke_size.tsx"));
const StrokeOption = React.lazy(() => import("./stroke.tsx"));
// const StrokeDash = React.lazy(() => import("./stroke_dash.tsx"));
const FillOption = React.lazy(() => import("./fill.tsx"));
const FillStyleOption = React.lazy(() => import("./fillstyle.tsx"));
const FontFamilyOption = React.lazy(() => import("./fontfamily.tsx"));
const FontSizes = React.lazy(() => import("./fontsize.tsx"));

const THEME_DEFAULTS = {
  dark: { foreground: "#cccccc", background: "#181818" },
  light: { foreground: "#202020", background: "#efefef" },
} as const;

function remapShapeColorsForTheme(
  canvas: Board | null,
  theme: "dark" | "light",
  prevForeground: string,
  nextForeground: string,
  prevBackground: string,
  nextBackground: string,
) {
  if (!canvas) return;
  const isDarkTheme = theme === "dark";

  canvas.shapeStore.forEach((shape) => {
    if (shape.type === "selection") return false;

    const updates: Record<string, string> = {};
    const stroke = shape.get("stroke")?.toLowerCase();
    const fill = shape.get("fill")?.toLowerCase();

    const darkColors = ["#1e1e1e", "#202020", "#000000", prevForeground.toLowerCase()];
    const lightColors = ["#ffffff", "#cccccc", "#efefef", prevForeground.toLowerCase()];

    const shouldSwapToForeground = (color: string) => {
      if (!color || color === "transparent") return false;
      if (color === prevForeground.toLowerCase()) return true;
      if (isDarkTheme && darkColors.includes(color)) return true;
      if (!isDarkTheme && lightColors.includes(color)) return true;
      return false;
    };

    const shouldSwapToBackground = (color: string) => {
      if (!color || color === "transparent") return false;
      if (color === prevBackground.toLowerCase()) return true;
      if (isDarkTheme && lightColors.includes(color)) return true;
      if (!isDarkTheme && darkColors.includes(color)) return true;
      return false;
    };

    if (shouldSwapToForeground(stroke)) {
      updates.stroke = nextForeground;
    }

    if (shape.type === "line" && shouldSwapToForeground(fill)) {
      updates.fill = nextForeground;
    } else if (shouldSwapToBackground(fill)) {
      updates.fill = nextBackground;
    }

    if (Object.keys(updates).length) {
      shape.set(updates);
    }

    return false;
  });
}

function LockShape({ as }: { as: Shape, canvas: Board }) {
  return (
    <Button
      onClick={() => {
        as.set("locked", !as?.locked);
      }}
      variant={"ghost"} size={"sm"}>
      {as?.locked ? <LockIcon /> : <UnlockIcon />}
    </Button>
  )
}

function ThemeToggle() {
  const {
    theme,
    setTheme,
    foreground,
    background,
    canvas,
    update,
    setForeground,
    setBackground,
    onThemeChange,
  } = useBoard();

  const handleThemeChange = (newTheme: "dark" | "light") => {
    const prevForeground = foreground;
    const prevBackground = background;
    const nextColors = THEME_DEFAULTS[newTheme];

    setTheme(newTheme);
    remapShapeColorsForTheme(
      canvas,
      newTheme,
      prevForeground,
      nextColors.foreground,
      prevBackground,
      nextColors.background,
    );

    canvas?.render();
    update();
  };

  const handleColorChange = (type: "foreground" | "background", color: string) => {
    if (type === "foreground") {
      setForeground(color);
      onThemeChange?.({ foreground: color });
    } else {
      setBackground(color);
      onThemeChange?.({ background: color });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={null} size="xs" className="relative">
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">Theme</span>
            <div className="flex gap-1">
              <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => handleThemeChange("dark")}
                className="h-7 px-2">
                <Moon className="h-3.5 w-3.5 mr-1" />
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => handleThemeChange("light")}
                className="h-7 px-2">
                <Sun className="h-3.5 w-3.5 mr-1" />
                Light
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />

          <div className="space-y-2">
            <ColorPickerRow
              label="Foreground"
              color={foreground}
              onChange={(color) => handleColorChange("foreground", color)}
            />
            <ColorPickerRow
              label="Background"
              color={background}
              onChange={(color) => handleColorChange("background", color)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColorPickerRow({
  label,
  color,
  onChange,
  disabled = false,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-50" style={{ opacity: disabled ? 0.5 : 1 }}>
      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted-foreground w-20">{label}</span>
        <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: color }} />
      </div>
      <div className="flex gap-1">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-5 h-5 border border-border cursor-pointer disabled:cursor-not-allowed"
        />
        {COLORS.slice(0, 6).map((c) => (
          <button
            key={c}
            className="w-5 h-5 border border-border hover:scale-110 transition-transform disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

type Props = {
  debounceMs?: number;
  className?: string;
  standalone?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

function OptionWrapper({
  standalone,
  icon,
  children,
  className,
  content,
}: {
  standalone?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  content: React.ReactNode;
}) {
  if (standalone) return <>{content}</>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button size="xs" variant="ghost" className={cn("relative", className)}>
            {icon}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={5} className="w-fit p-1 md:p-2">
        {content}
      </PopoverContent>
    </Popover>
  );
}

function ShapeOptions({ debounceMs = 50, className }: Props) {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const isMobile = useIsMobile();

  const handleDelete = () => {
    if (!activeShape || !canvas) return;
    canvas.removeShape(activeShape);
    setActiveShape(null);
  };

  const Content = () => (
    <>
      <FillOption debounceMs={debounceMs} />
      <StrokeOption debounceMs={debounceMs} />
      <OpacityOption debounceMs={debounceMs} />
      <StrokeSize debounceMs={debounceMs} />
      <RoughnessOption debounceMs={debounceMs} />
      <FillStyleOption debounceMs={debounceMs} />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <FontFamilyOption debounceMs={debounceMs} />
      <FontSizes debounceMs={debounceMs} />
      <div className="flex items-center gap-1">
        <BoldOption debounceMs={debounceMs} />
        <ItalicOption debounceMs={debounceMs} />
      </div>
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <RotationOption debounceMs={debounceMs} />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <AlignOptions debounceMs={debounceMs} />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <VerticalAlignOptions debounceMs={debounceMs} />
      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
      <ZOrderButtons debounceMs={debounceMs} />

      {(activeShape?.type === "group" || activeShape instanceof ActiveSelection) && (
        <div className="flex items-center gap-1">
          <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />
          {activeShape instanceof ActiveSelection ? (
            <Button
              variant={null}
              size="icon"
              className={cn("h-8 w-8", isMobile && "h-7 w-7")}
              onClick={() => {
                if (!(activeShape instanceof ActiveSelection) || !canvas) return;
                activeShape.group();
                const ac = canvas.getActiveShapes();
                setActiveShape(ac);
                canvas.render();
                update();
              }}>
              <GroupIcon className={cn("h-4 w-4", isMobile && "h-3.5 w-3.5")} />
            </Button>
          ) : (
            <Button
              variant={null}
              size="icon"
              className={cn("h-8 w-8", isMobile && "h-7 w-7")}
              onClick={() => {
                if (!(activeShape instanceof Group) || !canvas) return;
                // ungroup() clears groupId on all members (they're already in shapeStore)
                const shapes = activeShape.ungroup();
                // Remove only the group shape itself (members stay in store, now visible)
                canvas.shapeStore.removeById(activeShape.ID());
                canvas.discardActiveShapes();
                const sel = new ActiveSelection(
                  { shapes: shapes.map((s) => ({ s })), ctx: canvas.ctx, _board: canvas },
                  1,
                );
                canvas.add(sel);
                canvas.setActiveShape(sel);
                setActiveShape(sel);
                canvas.render();
                update();
              }}>
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
        variant="outline"
        size="xs"
        className={cn("text-destructive hover:text-destructive")}
        onClick={handleDelete}>
        <TrashIcon className={cn("h-4 w-4")} />
      </Button>

      <div className="w-[1px] bg-border mx-1 h-6 hidden md:block" />

      <ThemeToggle />
      <LockShape as={activeShape!} canvas={canvas!} />
    </>
  );

  if (isMobile) {
    if (typeof window === "undefined") return null;
    return createPortal(
      <div className="fixed right-4 bottom-20 z-[9999]">
        <Popover>
          <PopoverTrigger asChild>
            <Button className="shadow-xl rounded-full h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90" variant="default" size="icon">
              <MenuIcon className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn("w-[90vw] max-w-[360px] p-3 mb-2 mr-2 bg-background border rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto", className)} side="top" align="end" sideOffset={10}>
            <div className="flex flex-wrap gap-2 justify-start items-center">
              <Content />
            </div>
          </PopoverContent>
        </Popover>
      </div>,
      document.body
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-background border rounded-lg shadow-lg">
      <Content />
    </div>
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
        <Button variant={null} size="xs">
          <ArrowLeftRightIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-2" sideOffset={5}>
        <div className="flex items-center gap-2">
          <Button
            variant={activeShape?.get("arrowS") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleArrow(0)}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={activeShape?.get("arrowE") ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => handleArrow(1)}>
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ItalicOption({ debounceMs = 200 }: { debounceMs?: number }) {
  const { activeShape, canvas, setActiveShape, update } = useBoard();
  const currentItalic = !!(activeShape ? activeShape.get("italic") : canvas?.defaultShapeProps.italic);
  const [isItalic, setItalic] = useState(currentItalic);
  useEffect(() => setItalic(currentItalic), [currentItalic]);
  const handleUpdate = debounce(() => update(), debounceMs);

  return (
    <Button
      variant={isItalic ? "secondary" : "ghost"}
      size="xs"
      onClick={() => {
        if (!canvas) return;
        canvas.defaultShapeProps.italic = !isItalic;
        if (!activeShape) { handleUpdate(); return; }
        if (activeShape instanceof ActiveSelection) {
          activeShape.shapes.forEach((s) => {
            if (s.s) s.s.set("italic", !isItalic);
          });
        }
        activeShape?.set("italic", !isItalic);
        setItalic(!isItalic);

        setActiveShape(activeShape);
        canvas.render();
        handleUpdate();
      }}>
      <ItalicIcon className="h-4 w-4" />
    </Button>
  );
}

function AlignOptions({ debounceMs = 100, standalone, icon, children, className }: Props) {
  const { activeShape, canvas, update } = useBoard();
  const handleUpdate = debounce(() => update(), debounceMs);

  const handleAlign = (a: textAlign) => {
    if (canvas) canvas.defaultShapeProps.textAlign = a;
    if (!activeShape) { handleUpdate(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("textAlign", a);
      });
    }
    activeShape.set("textAlign", a);
    canvas?.render();
    handleUpdate();
  };

  const currentAlign = ((activeShape ? activeShape.get("textAlign") : canvas?.defaultShapeProps.textAlign) as textAlign) || "center";
  const content = () => (
    <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
      <Button
        variant={currentAlign === "left" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("left")}>
        <AlignLeftIcon className={cn("h-3.5 w-3.5")} />
      </Button>
      <Button
        variant={currentAlign === "center" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("center")}>
        <AlignCenterIcon className={cn("h-3.5 w-3.5")} />
      </Button>
      <Button
        variant={currentAlign === "right" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("right")}>
        <AlignRightIcon className={cn("h-3.5 w-3.5")} />
      </Button>
    </div>
  )

  return (
    <OptionWrapper
      content={content()}
      children={children}
      className={className}
      standalone={standalone}
      icon={icon}
    />
  );
}

function BoldOption({ debounceMs = 200 }: { debounceMs?: number }) {
  const { activeShape, canvas, update } = useBoard();
  const currentW = (activeShape ? activeShape.get("fontWeight") : canvas?.defaultShapeProps.fontWeight) as number || 500;
  const [w, setW] = useState(currentW);
  useEffect(() => setW(currentW), [currentW]);
  const handleUpdate = debounce(() => update(), debounceMs);

  return (
    <Button
      variant={w !== 500 ? "secondary" : "ghost"}
      size="xs"
      onClick={() => {
        if (!canvas) return;
        canvas.defaultShapeProps.fontWeight = w === 500 ? 800 : 500;
        if (!activeShape) { handleUpdate(); return; }
        activeShape.set("fontWeight", w === 500 ? 800 : 500);
        canvas.render();
        handleUpdate();
        setW((p) => (p == 500 ? 800 : 500));
      }}>
      <BoldIcon className={cn("h-4 w-4")} />
    </Button>
  );
}

function RoughnessOption({ debounceMs = 0, className, standalone, children }: Props) {
  const { activeShape, canvas, update } = useBoard();
  // Provide a fallback of 1 (Artist) if roughness isn't explicitly set yet
  const activeRoughness = (activeShape ? activeShape.get("roughness") : canvas?.defaultShapeProps.roughness) ?? 1;
  const handleSetRoughness = (v: number) => {

    if (canvas) canvas.defaultShapeProps.roughness = v;
    if (!activeShape) { update(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        s.s.set("roughness", v);
      });
    } else {
      activeShape.set("roughness", v);
    }
    canvas?.render();
    update();
  };

  const content = (
    <>
      <div className="flex flex-col gap-1.5 mb-2 px-1">
        <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Sloppiness</span>
      </div>
      <div className="flex gap-1">
        <Button
          variant={activeRoughness === 0 ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetRoughness(0)}
          title="Architect"
          className={cn("h-8 w-8 p-0", activeRoughness === 0 && "bg-secondary text-secondary-foreground")}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant={activeRoughness === 1 ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetRoughness(1)}
          title="Artist"
          className={cn("h-8 w-8 p-0", activeRoughness === 1 && "bg-secondary text-secondary-foreground")}>
          <Waves className="h-4 w-4" />
        </Button>
        <Button
          variant={activeRoughness === 2 ? "secondary" : "ghost"}
          size="xs"
          onClick={() => handleSetRoughness(2)}
          title="Cartoonist"
          className={cn("h-8 w-8 p-0", activeRoughness === 2 && "bg-secondary text-secondary-foreground")}>
          <BrushIcon className="h-4 w-4" />
        </Button>
      </div>
    </>
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={
        <div className="flex h-6 w-6 items-center justify-center rounded border bg-muted/50 transition-colors hover:bg-muted" title="Sloppiness">
          {activeRoughness === 0 ? (
            <Minus className="h-3 w-3" />
          ) : activeRoughness === 1 ? (
            <Waves className="h-3 w-3" />
          ) : (
            <BrushIcon className="h-3 w-3" />
          )}
        </div>
      }
      children={children}
      className={className}
      content={content}
    />
  );
}

function RotationOption({ debounceMs = 200, className, standalone, children }: Props) {
  const { activeShape, canvas } = useBoard();

  const getRotation = () => {
    if (!activeShape) return 0;
    const rotation = (activeShape.rotate * 180) / Math.PI;
    return Math.round(rotation < 0 ? rotation + 360 : rotation) % 360;
  };

  const [localRotation, setLocalRotation] = useState(getRotation());

  useEffect(() => {
    setLocalRotation(getRotation());
    // eslint-disable-next-line
  }, [activeShape]);

  const content = (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium">Rotation</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="360"
          defaultValue={localRotation}
          onChange={debounce((e) => {
            if (!activeShape || !canvas) return;
            const deg = Number(e.target.value);
            setLocalRotation(deg);

            const rad = (deg * Math.PI) / 180;

            if (activeShape instanceof ActiveSelection) {
              activeShape.shapes.forEach((s) => {
                if (s.s) s.s.set("rotate", rad);
              });
            }

            activeShape.set("rotate", rad);
            activeShape.setCoords();
            canvas.render();
          }, debounceMs)}
          className="flex-1"
        />
        <span className="text-xs w-8 text-right">{localRotation}°</span>
      </div>
      <div className="grid grid-cols-4 gap-1 mt-1">
        {[0, 45, 90, 180].map((deg) => (
          <Button
            key={deg}
            variant="outline"
            size="xs"
            className="h-6 text-[10px]"
            onClick={debounce(() => {
              if (!activeShape || !canvas) return;
              const rad = (deg * Math.PI) / 180;
              if (activeShape instanceof ActiveSelection) {
                activeShape.shapes.forEach((s) => {
                  if (s.s) s.s.set("rotate", rad);
                });
              }
              activeShape.set("rotate", rad);
              activeShape.setCoords();
              canvas.render();
              setLocalRotation(deg);
            }, debounceMs)} >
            {deg}°
          </Button>
        ))}
      </div>
    </div >
  );

  return (
    <OptionWrapper
      standalone={standalone}
      icon={
        <>
          <RotateCwIcon className={cn("h-3 w-3")} />
          {localRotation}°
        </>
      }
      children={children}
      className={className}
      content={content}
    />
  );
}

function VerticalAlignOptions({ debounceMs = 50, children, className, icon, standalone }: Props) {
  const { activeShape, canvas, update } = useBoard();
  const handleUpdate = debounce(() => update(), debounceMs);

  const handleAlign = (a: "top" | "center" | "bottom") => {
    if (canvas) canvas.defaultShapeProps.verticalAlign = a;
    if (!activeShape) { handleUpdate(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("verticalAlign", a);
      });
    }
    activeShape.set("verticalAlign", a);
    canvas?.render();
    handleUpdate();
  };

  const currentAlign =
    ((activeShape ? activeShape.get("verticalAlign") : canvas?.defaultShapeProps.verticalAlign) as "top" | "center" | "bottom") || "center";

  const content = (
    <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
      <Button
        variant={currentAlign === "top" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("top")}>
        <ArrowUpToLine className={cn("h-3.5 w-3.5")} />
      </Button>
      <Button
        variant={currentAlign === "center" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("center")}>
        <AlignVerticalJustifyCenter className={cn("h-3.5 w-3.5")} />
      </Button>
      <Button
        variant={currentAlign === "bottom" ? "secondary" : "ghost"}
        size="xs"
        className={cn("rounded-sm")}
        onClick={() => handleAlign("bottom")}>
        <ArrowDownToLine className={cn("h-3.5 w-3.5")} />
      </Button>
    </div>
  );
  return (
    <OptionWrapper
      content={content}
      children={children}
      className={className}
      icon={icon}
      standalone={standalone}
    />
  )
}

function DuplicateOption({ className }: Props) {
  const { activeShape, canvas } = useBoard();
  if (!activeShape || !canvas) return null;

  const handleClone = () => {
    const clone = activeShape.clone();
    clone.top += 10;
    clone.left += 10;
    canvas.add(clone);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={"outline"}
          size={"sm"}
          className={cn("border-none", className)}
          onClick={handleClone}
        >
          <CopyIcon className="w-3.5 h-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Duplicate
      </TooltipContent>
    </Tooltip>
  )
}

function ZOrderButtons({ debounceMs = 200, className }: { debounceMs?: number, className?: string }) {
  const { activeShape, canvas, update } = useBoard();
  const handleUpdate = debounce(() => update(), debounceMs);

  if (!activeShape || activeShape instanceof ActiveSelection) return null;

  return (
    <div className={className}>
      <button
        className="border rounded-sm p-1"
        onClick={() => { canvas?.bringToFront(activeShape as Shape); handleUpdate(); }}>
        <BringToFront className="h-4 w-4" />
      </button>
      <button
        className="border rounded-sm p-1"
        onClick={() => { canvas?.bringForward(activeShape as Shape); handleUpdate(); }}>
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        className="border rounded-sm p-1"
        onClick={() => { canvas?.sendBackward(activeShape as Shape); handleUpdate(); }}>
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        className="border rounded-sm p-1"
        onClick={() => { canvas?.sendToBack(activeShape as Shape); handleUpdate(); }}>
        <SendToBack className="h-4 w-4" />
      </button>
    </div>
  );
}

function DeleteOption({ className }: Props) {
  const { activeShape, canvas } = useBoard();
  const disabled = (!activeShape || !canvas)

  const handleDelete = () => {
    if (!activeShape || !canvas) return;
    canvas.removeShape(activeShape);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={className}>
          <Button disabled={disabled} variant="outline" size="sm" className="border-none" onClick={handleDelete}>
            <TrashIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Delete
      </TooltipContent>
    </Tooltip>
  )
}

function RadiusOption({ className, debounceMs = 0 }: Props) {
  const { canvas, activeShape, update } = useBoard()

  const handleRadius = (v: number) => {
    if (!activeShape || !canvas) return;
    if (activeShape instanceof ActiveSelection || activeShape instanceof Group) {
      activeShape.shapes.forEach((s) => {
        s.s.radius = v;
      });
    } else {
      activeShape.radius = v;
    }
    canvas.defaultShapeProps.radius = v;
    canvas.render();
    update();
  };

  return (
    <div className={className}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => handleRadius(15)} className="w-6 h-6 border rounded-md" />
        </TooltipTrigger>
        <TooltipContent>
          Round
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => handleRadius(5)} className="w-6 h-6 border rounded-none" />
        </TooltipTrigger>
        <TooltipContent>
          Sharp
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export {
  ShapeOptions as BoardShapeOptions,
  DuplicateOption,
  DeleteOption,
  ZOrderButtons,
  VerticalAlignOptions,
  AlignOptions,
  ItalicOption,
  BoldOption,
  RoughnessOption,
  RotationOption,
  LockShape,
  ThemeToggle,
  RadiusOption
};
export default ShapeOptions;
