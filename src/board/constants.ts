import Pointer from "./utils/point";

const INDICATOR_COLOR = "#6965db"; // Excalidraw-like purple
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
   { label: "Default", value: "system-ui" },
   { label: "Comic", value: '"Comic Sans MS", "Comic Sans", cursive' },
   { label: "Mono", value: 'monospace' },
   { label: "Cursive", value: 'cursive' },
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
   INDICATOR_COLOR
};
