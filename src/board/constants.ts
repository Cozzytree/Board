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
const SnapeLineColor = "#FF2020";
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

export {
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
