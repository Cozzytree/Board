import { createContext, useContext } from "react";
import type { LucideIcon } from "lucide-react";
import { Board, Shape } from "./index";
import type { modes, submodes } from "./types";

export type ContextProps = {
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
};

export const BoardContext = createContext<ContextProps | undefined>(undefined);

export const useBoard = () => {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("board ctx must be used within boadProvider");
  return ctx;
};
