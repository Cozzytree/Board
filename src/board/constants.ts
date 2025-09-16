import Pointer from "./utils/point";

const LINE_CONNECTION_PADDING = 10;
const SCALE_RATE = 0.15;
const keysNotNeeded = ["ctx", "eventListeners"];
const HoveredColor = "#007FFF";
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
   { label: "Huge", size: 25 },
   { label: "Large", size: 20 },
   { label: "Medium", size: 18 },
   { label: "Small", size: 15 },
];

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
   SCALE_RATE,
   pathShapesPoints,
   LINE_CONNECTION_PADDING,
   keysNotNeeded,
   HoveredColor,
   COLORS,
   FONT_SIZES,
};
