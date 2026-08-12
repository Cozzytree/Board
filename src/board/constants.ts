import { ArrowRightIcon, BoxIcon, CircleIcon, EraserIcon, GrabIcon, Hexagon, ImageIcon, MessageSquare, MinusIcon, MousePointer, PencilIcon, PentagonIcon, PlusIcon, SplineIcon, Star, TriangleIcon, TypeOutlineIcon, VectorSquareIcon, type LucideIcon } from "lucide-react";
import type { CustomShapeDef, modes, submodes } from "./types";
import Pointer from "./utils/point";

const CURSOR_COLORS = [
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
];

const INDICATOR_COLOR = "#7975eb"; // Excalidraw-like purple
const LINE_CONNECTION_PADDING = 10;
const SCALE_RATE = 0.15;
const keysNotNeeded = ["ctx", "eventListeners"];
const HoveredColor = "#007FFF";
const SnapeLineColor = "#EF1010";
const COLORS = [
  "#606090",
  "#487F88",
  "#92CEAC",
  "#EFD36C",
  "#F3AEAF",
  "#6B7280",
  "#FF5050",
  "#FF2080",
  "#EFEFEF",
  "#222222",
  HoveredColor,
];
const FONT_SIZES = [
  { label: "XL", size: 25 },
  { label: "L", size: 20 },
  { label: "M", size: 18 },
  { label: "S", size: 15 },
];

const FONT_FAMILIES = [
  { label: "Handdrawn", value: '"Comic Sans MS", "Comic Sans", cursive', iconName: "PenLine" },
  { label: "Normal", value: 'system-ui', iconName: "Type" },
  { label: "Code", value: 'monospace', iconName: "Terminal" },
  { label: "Cursive", value: 'cursive', iconName: "Italic" },
];

const strokeSize = [2, 3, 5];

const Width = 4;

const pathShapesPoints = {
  cube: [
    new Pointer({ x: 0, y: Width * 0.2 }),
    new Pointer({ x: Width * 0.6, y: 0 }),
    new Pointer({ x: Width, y: Width * 0.2 }),
    new Pointer({ x: 0, y: Width * 0.2 }),
  ],
};

const MODES: (customShapes: CustomShapeDef[]) => {
  mode: modes;
  I: LucideIcon | string;
  subMode: { sm: submodes; I: LucideIcon | string }[];
}[] = (customShapes) => [
  {
    mode: "cursor",
    I: MousePointer,
    subMode: [
      { sm: "free", I: MousePointer },
      { sm: "grab", I: GrabIcon },
    ],
  },
  {
    mode: "shape",
    I: CircleIcon,
    subMode: [
      { sm: "circle", I: CircleIcon },
      { sm: "rect", I: BoxIcon },
      { sm: "path:pentagon", I: PentagonIcon },
      { sm: "path:triangle", I: TriangleIcon },
      { sm: "path:plus", I: PlusIcon },
      { sm: "path:star", I: Star },
      { sm: "path:hexagon", I: Hexagon },
      { sm: "path:arrow", I: ArrowRightIcon },
      { sm: "path:message", I: MessageSquare },
      ...customShapes.map((s) => ({
        sm: s.name as submodes,
        I: s.icon,
      })),
      {
        sm: "path:diamond",
        I: DiamondIcon,
      },
      {
        sm: "path:trapezoid",
        I: "/shapes/trapezoid.svg",
      },
    ],
  },

  {
    mode: "line",
    I: SplineIcon,
    subMode: [
      { sm: "line:anchor", I: SplineIcon },
      { sm: "line:straight", I: MinusIcon },
    ],
  },
  {
    mode: "draw",
    I: PencilIcon,
    subMode: [{ sm: "pencil", I: PencilIcon }],
  },
  {
    mode: "text",
    I: TypeOutlineIcon,
    subMode: [],
  },
  {
    mode: "eraser",
    I: EraserIcon,
    subMode: [],
  },
  {
    mode: "image",
    I: ImageIcon,
    subMode: [],
  },
  {
    mode: "frame",
    I: VectorSquareIcon,
    subMode: []
  }
]

export {
  MODES,
  SnapeLineColor,
  strokeSize,
  SCALE_RATE,
  pathShapesPoints,
  LINE_CONNECTION_PADDING,
  keysNotNeeded,
  HoveredColor,
  COLORS,
  FONT_SIZES,
  FONT_FAMILIES,
  INDICATOR_COLOR,
  CURSOR_COLORS
};
