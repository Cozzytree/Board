import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export const generateShades = (hex: string) => {
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

export const COLOR_PALETTE = EXCALIDRAW_COLORS.map(generateShades);

export type Props = {
  debounceMs?: number;
  className?: string;
  standalone?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export function OptionWrapper({
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
