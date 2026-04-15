import { createContext, useContext, type RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { Board, Shape } from "./index";
import type { modes, submodes } from "./types";

export type ContextProps = {
  foreground: string;
  background: string;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  setForeground: (color: string) => void;
  setBackground: (color: string) => void;
  onThemeChange?: (settings: { theme?: "dark" | "light"; background?: string; foreground?: string }) => void;
  isOwner?: boolean;
  mode: { m: modes; sm: submodes | null };
  setMode: (m: modes, sm: submodes | null) => void;
  tools: {
    mode: modes;
    I: LucideIcon | string;
    subMode: { sm: submodes; I: LucideIcon | string }[];
  }[];
  activeShape: Shape | null;
  canvas: Board | null;
  setActiveShape: (v: Shape | null) => void;

  snap: boolean;
  hover: boolean;

  setSnap: (s: boolean) => void;
  setHover: (h: boolean) => void;
  update: () => void;
  importLibrary: (library: any) => void;

  // Composable UI state
  zoom: number;
  offset: [number, number];
  isMinimal: boolean;
  setMinimal: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleZoom: (zoomIn: boolean) => void;
  handleCenter: () => void;
  exportBoardAsLibrary: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
};

export const BoardContext = createContext<ContextProps | undefined>(undefined);

export const useBoard = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("board ctx must be used within BoardProvider");
  return ctx;
};
