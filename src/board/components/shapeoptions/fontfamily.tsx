import { cn, debounce } from "@/lib/utils";
import { useBoard } from "../../board-context";
import ActiveSelection from "@/board/shapes/active_selection";
import { FONT_FAMILIES } from "@/board/constants";
import { CheckLineIcon, ChevronDown, ItalicIcon, PenLineIcon, TerminalIcon, TypeIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Props } from "./utils";

export default function FontFamilyOption({ debounceMs = 200, className, standalone }: Props) {
  const { activeShape, canvas, update } = useBoard();
  const handleUpdate = debounce(() => update(), debounceMs);

  const handleSetFont = (fValue: string) => {
    if (canvas) canvas.defaultShapeProps.fontFamily = fValue;
    if (!activeShape) { handleUpdate(); return; }
    if (activeShape instanceof ActiveSelection) {
      activeShape.shapes.forEach((s) => {
        if (s.s) s.s.set("fontFamily", fValue);
      });
    }
    activeShape.set("fontFamily", fValue);
    canvas?.render();
    handleUpdate();
  };

  const mainFonts = FONT_FAMILIES.slice(0, 3);
  const currentFont = (activeShape ? activeShape.get("fontFamily") : canvas?.defaultShapeProps.fontFamily) || FONT_FAMILIES[0].value;

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "PenLine": return <PenLineIcon className="h-4 w-4" />;
      case "Type": return <TypeIcon className="h-4 w-4" />;
      case "Terminal": return <TerminalIcon className="h-4 w-4" />;
      case "Italic": return <ItalicIcon className="h-4 w-4" />;
      default: return <TypeIcon className="h-4 w-4" />;
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
                  {currentFont === f.value && <CheckLineIcon className="h-3 w-3" />}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
