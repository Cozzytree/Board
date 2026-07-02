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
   CheckIcon,
   Circle,
   CircleDashed,
   GroupIcon,
   ItalicIcon,
   Minus,
   PaintBucket,
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
   Square,
   Waves,
   HashIcon,
   LockIcon,
   UnlockIcon,
   PenLine,
   Type,
   Terminal,
   CircleDotDashed,
   CopyIcon,
   PenIcon,
} from "lucide-react";
import { useBoard } from "../board-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { COLORS, FONT_SIZES, FONT_FAMILIES, strokeSize } from "../constants";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { textAlign } from "../types";
import { useIsMobile } from "@/hooks/use-mobile"
import ActiveSelection from "../shapes/active_selection";
import Group from "../shapes/group";
import { Button } from "@/components/ui/button";
import type { Board, Shape } from "../index";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const EXCALIDRAW_COLORS = [
   "#1E1E1E",
   "#5F6368",
   "#E03131",
   "#F08C00",
   "#2B8A3E",
   "#1971C2",
   "#6741D9",
   "#9C36B5",
   "#7A4E2D",
   "#FFFFFF",
];

const generateShades = (hex: string) => {
   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
   if (!result) return [hex, hex, hex, hex, hex];
   const r = parseInt(result[1], 16) / 255;
   const g = parseInt(result[2], 16) / 255;
   const b = parseInt(result[3], 16) / 255;
   const max = Math.max(r, g, b), min = Math.min(r, g, b);
   let h = 0, s = 0, l = (max + min) / 2;
   if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
         case r: h = (g - b) / d + (g < b ? 6 : 0); break;
         case g: h = (b - r) / d + 2; break;
         case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
   }
   h = h * 360;
   s = s * 100;
   l = l * 100;

   const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
         const k = (n + h / 30) % 12;
         const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
         return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
   };

   return [
      hslToHex(h, s, Math.min(95, l + 30)),
      hslToHex(h, s, Math.min(85, l + 15)),
      hex,
      hslToHex(h, s, Math.max(15, l - 15)),
      hslToHex(h, s, Math.max(5, l - 30)),
   ];
};

const COLOR_PALETTE = EXCALIDRAW_COLORS.map(generateShades);

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
      setForeground(nextColors.foreground);
      setBackground(nextColors.background);

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
      onThemeChange?.({ theme: newTheme });
      onThemeChange?.({
         foreground: nextColors.foreground,
         background: nextColors.background,
      });
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
         <StrokeDash debounceMs={debounceMs} />
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
               <PopoverContent className={cn("w-[85vw] max-w-[320px] p-3 mb-2 mr-2 bg-background border rounded-xl shadow-2xl", className)} side="top" align="end" sideOffset={10}>
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

function OpacityOption({ debounceMs = 100, className, standalone = false, children, icon }: Props) {
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
         icon={icon || <Square opacity={0.5} />}
         children={children}
         className={className}
         content={content}
      />
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

function StrokeSize({ debounceMs = 50, className, standalone, icon, children }: Props) {
   const { activeShape, canvas, setActiveShape, update } = useBoard();

   const handleStrokeSize = debounce((n: number) => {
      if (!activeShape) return;
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
   }, debounceMs)

   const content = (
      <div className={"flex flex-col gap-2"}>
         <div className="flex gap-1">
            {strokeSize.map((s) => (
               <button
                  key={s}
                  className={cn(
                     "flex items-center cursor-pointer h-8 rounded-sm",
                     activeShape?.get("strokeWidth") === s ? "bg-muted" : "",
                  )}
                  onClick={() => {
                     handleStrokeSize(s);
                  }}>
                  <div className="bg-foreground w-4" style={{ height: s }} />
               </button>
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
               defaultValue={Number(activeShape?.get("strokeWidth") || 0)}
            />
         </div>
      </div>
   );

   return (
      <OptionWrapper
         standalone={standalone}
         icon={
            icon ||
            <Minus
               style={{
                  transform: `scaleY(${Math.min(Math.max((activeShape?.get("strokeWidth") || 1) * 0.5, 1), 3)})`,
               }}
            />
         }
         children={children}
         className={className}
         content={content}
      />
   );
}

function StrokeOption({ debounceMs = 200, className, standalone = false, icon, mobile = false }: Props & { mobile?: boolean }) {
   const { activeShape, canvas, setActiveShape, update } = useBoard();
   const [shade, setShade] = useState(0);
   const applyStroke = debounce((val: string) => {
      if (!activeShape) return;

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
   }, debounceMs);

   const content = () => {
      const activeShade = generateShades(activeShape?.get("stroke") || "");
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
                        applyStroke(c);
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
                              activeShape?.get("stroke") === c ? "ring-2 ring-primary ring-offset-1" : "",
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
                     defaultValue={activeShape?.get("stroke")}
                  />
                  <div className="relative h-6 w-6 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:scale-110 transition-transform">
                     <Label htmlFor="cst-c">
                        <PenIcon width={13} />
                     </Label>
                     <input
                        id="cst-c"
                        type="color"
                        className="hidden inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                        value={activeShape?.get("stroke") || "#000000"}
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
                        applyStroke(c);
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
                              className="bottom-1 right-1 w-6 h-6 rounded-sm border border-background"
                              style={{ background: activeShape?.get("stroke") || "currentColor" }}
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

function FillOption({ debounceMs = 200, className, standalone = false, icon, mobile = false }: Props & { mobile?: boolean }) {
   const { activeShape, canvas, setActiveShape, update } = useBoard();
   const [shade, setShade] = useState(0);

   const applyFill = debounce((color: string) => {
      if (!activeShape) return;
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
   }, debounceMs);

   const content = () => {
      const activeShade = generateShades(activeShape?.get("fill") || "");
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
                        applyFill(c);
                     }
                  }}
               >
                  <button
                     type="button"
                     onClick={() => applyFill("#00000000")}
                     className={cn(
                        "h-5 w-5 rounded-sm border border-border flex items-center justify-center hover:bg-muted transition-colors relative overflow-hidden",
                        activeShape?.get("fill") === "transparent" ||
                           activeShape?.get("fill") === "#00000000" ||
                           !activeShape?.get("fill")
                           ? "ring-2 ring-primary ring-offset-1"
                           : "",
                     )}>
                     <div className="absolute inset-0 bg-destructive/70 rotate-45 w-[1px] h-[200%] top-[-50%] left-1/2 -translate-x-1/2" />
                  </button>
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
                              activeShape?.get("fill") === c ? "ring-2 ring-primary ring-offset-1" : "",
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
                        <button data-shade={s} key={s}>
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
                     defaultValue={activeShape?.get("fill")}
                  />
                  <div className="relative h-6 w-6 rounded-md overflow-hidden border border-border/50 cursor-pointer hover:scale-110 transition-transform">
                     <Label htmlFor="cst-fill-c">
                        <PaintBucket width={13} />
                     </Label>
                     <input
                        id="cst-fill-c"
                        type="color"
                        className="hidden inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                        value={
                           activeShape?.get("fill") === "transparent"
                              ? "#ffffff"
                              : activeShape?.get("fill") || "#ffffff"
                        }
                        onChange={(e) => {
                           if (!activeShape) return;
                           applyFill(e.target.value);
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
                        applyFill(c);
                     }
                  }}
                     className="flex items-center gap-0.5">
                     {COLORS.slice(0, 4).map((c) =>
                        <button data-cc={c} key={c}>
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
                              className="bottom-1 right-1 w-6 h-6 rounded-sm border border-background"
                              style={{ background: activeShape?.get("fill") || "currentColor" }}
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

function ItalicOption({ debounceMs = 200 }: { debounceMs?: number }) {
   const { activeShape, canvas, setActiveShape, update } = useBoard();
   const [isItalic, setItalic] = useState(!!activeShape?.get("italic"));
   const handleUpdate = debounce(() => update(), debounceMs);

   return (
      <Button
         variant={isItalic ? "secondary" : "ghost"}
         size="xs"
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
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            if (s.s) s.s.set("textAlign", a);
         });
      }
      activeShape.set("textAlign", a);
      canvas.render();
      handleUpdate();
   };

   const currentAlign = (activeShape?.get("textAlign") as textAlign) || "center";
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
   const [w, setW] = useState((activeShape?.get("fontWeight") as number) || 500);
   const handleUpdate = debounce(() => update(), debounceMs);

   return (
      <Button
         variant={w !== 500 ? "secondary" : "ghost"}
         size="xs"
         onClick={() => {
            if (!activeShape || !canvas) return;
            activeShape.set("fontWeight", w === 500 ? 800 : 500);
            canvas.render();
            handleUpdate();
            setW((p) => (p == 500 ? 800 : 500));
         }}>
         <BoldIcon className={cn("h-4 w-4")} />
      </Button>
   );
}

function FontSizes({ debounceMs = 200, className, standalone, children }: Props) {
   const { activeShape, canvas, update } = useBoard();
   const handleUpdate = debounce(() => update(), debounceMs);
   const currentSize = activeShape?.get("fontSize");
   const matchedPreset = FONT_SIZES.find((f) => f.size === currentSize);
   const displayLabel = matchedPreset ? matchedPreset.label : currentSize || "Size";

   const handleSizeChange = (newSize: number) => {
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            if (s.s) s.s.set("fontSize", newSize);
         });
      }
      activeShape.set("fontSize", newSize);
      canvas.render();
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

function FontFamilyOption({ debounceMs = 200, className, standalone }: Props) {
   const { activeShape, canvas, update } = useBoard();
   const handleUpdate = debounce(() => update(), debounceMs);

   const handleSetFont = (fValue: string) => {
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            if (s.s) s.s.set("fontFamily", fValue);
         });
      }
      activeShape.set("fontFamily", fValue);
      canvas.render();
      handleUpdate();
   };

   const mainFonts = FONT_FAMILIES.slice(0, 3);
   const currentFont = activeShape?.get("fontFamily") || FONT_FAMILIES[0].value;

   const getIconComponent = (iconName: string) => {
      switch (iconName) {
         case "PenLine": return <PenLine className="h-4 w-4" />;
         case "Type": return <Type className="h-4 w-4" />;
         case "Terminal": return <Terminal className="h-4 w-4" />;
         case "Italic": return <ItalicIcon className="h-4 w-4" />;
         default: return <Type className="h-4 w-4" />;
      }
   };

   return (
      <TooltipProvider>
         <div className={cn("flex items-center gap-1", className)}>
            {!standalone &&
               <>
                  {mainFonts.map((f) => (
                     <Tooltip key={f.value}>
                        <TooltipTrigger asChild>
                           <Button
                              variant={currentFont === f.value ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => handleSetFont(f.value)}
                           >
                              {getIconComponent(f.iconName as string)}
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{f.label}</p>
                        </TooltipContent>
                     </Tooltip>
                  ))}
               </>
            }

            {/* Extra button for all options */}
            <Popover>
               <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-sm">
                     <ChevronDown width={10} />
                  </Button>
               </PopoverTrigger>
               <PopoverContent className="w-48 p-1 z-[999]" sideOffset={5}>
                  <div className="flex flex-col gap-0.5">
                     {FONT_FAMILIES.map((f) => (
                        <Button
                           key={f.label}
                           variant={currentFont === f.value ? "secondary" : "ghost"}
                           className="justify-start h-8 w-full"
                           style={{ fontFamily: f.value }}
                           onClick={() => handleSetFont(f.value)}
                        >
                           {getIconComponent(f.iconName as string)}
                           <span className="text-xs ml-2 mr-auto">{f.label}</span>
                           {currentFont === f.value && <CheckIcon className="h-3 w-3" />}
                        </Button>
                     ))}
                  </div>
               </PopoverContent>
            </Popover>
         </div>
      </TooltipProvider>
   );
}

function RoughnessOption({ debounceMs = 100, className, standalone, children }: Props) {
   const { activeShape, canvas, update } = useBoard();

   // Provide a fallback of 1 (Artist) if roughness isn't explicitly set yet
   const activeRoughness = activeShape?.get("roughness") ?? 1;

   const handleSetRoughness = debounce((v: number) => {
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            s.s.set("roughness", v);
         });
      } else {
         activeShape.set("roughness", v);
      }
      canvas.render();
      update();
   }, debounceMs);

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

function FillStyleOption({ debounceMs = 200, className, standalone, children }: Props) {
   const { activeShape, canvas, update } = useBoard();
   const activeFillStyle = activeShape?.get("fillStyle") ?? "hachure";
   const handleUpdate = debounce(() => update(), debounceMs);

   const handleSetFillStyle = (v: string) => {
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            s.s.set("fillStyle", v);
         });
      } else {
         activeShape.set("fillStyle", v);
      }
      canvas.render();
      handleUpdate();
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

function StrokeDash({ debounceMs = 200, className, standalone, children }: Props) {
   const { setActiveShape, activeShape, canvas, update } = useBoard();
   const [, setS] = useState(activeShape?.get("dash").toString() || "");
   const handleUpdate = debounce(() => update(), debounceMs);

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
      handleUpdate();
   };

   const currentDash = activeShape?.get("dash").toString() || "0,0";

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
      if (!activeShape || !canvas) return;
      if (activeShape instanceof ActiveSelection) {
         activeShape.shapes.forEach((s) => {
            if (s.s) s.s.set("verticalAlign", a);
         });
      }
      activeShape.set("verticalAlign", a);
      canvas.render();
      handleUpdate();
   };

   const currentAlign =
      (activeShape?.get("verticalAlign") as "top" | "center" | "bottom") || "center";

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
   if (!activeShape || !canvas) return null;

   const handleDelete = () => {
      if (!activeShape || !canvas) return;
      canvas.removeShape(activeShape);
   };

   return (
      <Tooltip>
         <TooltipTrigger asChild>
            <div className={className}>
               <Button variant="outline" size="sm" className="border-none" onClick={handleDelete}>
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

export {
   ShapeOptions as BoardShapeOptions,
   DuplicateOption,
   DeleteOption,
   StrokeDash,
   StrokeOption,
   StrokeSize,
   OpacityOption,
   ZOrderButtons,
   VerticalAlignOptions,
   AlignOptions,
   ItalicOption,
   BoldOption,
   FillOption,
   RoughnessOption,
   FontFamilyOption,
   FontSizes,
   RotationOption,
   FillStyleOption,
   LockShape,
   ThemeToggle,
};
export default ShapeOptions;
