import { create } from 'zustand'
import type { modes, submodes } from "./types";
import Shape from "./shapes/shape";
import Board from "./board"
import type { Theme } from "./board_provider";
import type { LucideIcon } from "lucide-react";
// import type { RefObject } from 'react';

export type BoardState = {
  stat: boolean;
  foreground: string;
  background: string;
  theme: Theme;
  isOwner?: boolean;
  mode: { m: modes; sm: submodes | null };
  tools: {
    mode: modes;
    I: LucideIcon | string;
    subMode: { sm: submodes; I: LucideIcon | string }[];
  }[];
  activeShape: Shape | null;
  canvas: Board | null;
  snap: boolean;
  hover: boolean;
  zoom: number;
  offset: [number, number];
  isMinimal: boolean;
  width: number;
  height: number;
  snapGrid: boolean;
  undoStack: Record<string, any>[][];
  redoStack: Record<string, any>[][];
  historyVersion: number;

  setTheme: (theme: Theme) => void;
  setForeground: (color: string) => void;
  setBackground: (color: string) => void;
  setMode: (mode: { m: modes; sm: submodes | null }) => void;
  setTools: (tools: any) => void;
  setActiveShape: (v: Shape | null) => void;
  setCanvas: (canvas: Board | null) => void;
  setStat: (s: boolean) => void;
  setSnap: (s: boolean) => void;
  setHover: (h: boolean) => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: [number, number]) => void;
  setMinimal: (v: boolean | ((prev: boolean) => boolean)) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setSnapGrid: (v: boolean) => void;
  setUndoStack: (stack: Record<string, any>[][]) => void;
  setRedoStack: (stack: Record<string, any>[][]) => void;
  setHistoryVersion: (v: number | ((prev: number) => number)) => void;

  // actions
  update: () => void;
};

export const useBoardStore = create<BoardState>((set) => ({
  stat: false,
  foreground: localStorage.getItem("canvas_fg") || "#202020",
  background: localStorage.getItem("canvas_bg") || "",
  theme: "dark",
  mode: { m: "cursor", sm: "free" },
  tools: [],
  activeShape: null,
  canvas: null,
  snap: false,
  hover: true,
  zoom: 100,
  offset: [0, 0],
  isMinimal: false,
  width: typeof window !== "undefined" ? window.innerWidth : 800,
  height: typeof window !== "undefined" ? window.innerHeight : 600,
  snapGrid: false,
  undoStack: [],
  redoStack: [],
  historyVersion: 0,

  setTheme: (theme) => set({ theme }),
  setForeground: (foreground) => {
    localStorage.setItem("canvas_fg", foreground);
    set({ foreground })
  },
  setBackground: (background) => {
    localStorage.setItem("canvas_bg", background);
    set({ background })
  },
  setMode: (mode) => set({ mode }),
  setTools: (tools) => set({ tools }),
  setActiveShape: (activeShape) => set({ activeShape }),
  setCanvas: (canvas) => set({ canvas }),
  setStat: (stat) => set({ stat }),
  setSnap: (snap) => set({ snap }),
  setHover: (hover) => set({ hover }),
  setZoom: (zoom) => set({ zoom }),
  setOffset: (offset) => set({ offset }),
  setMinimal: (v) => set((state) => ({ isMinimal: typeof v === "function" ? v(state.isMinimal) : v })),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
  setSnapGrid: (snapGrid) => set({ snapGrid }),
  setUndoStack: (undoStack) => set({ undoStack }),
  setRedoStack: (redoStack) => set({ redoStack }),
  setHistoryVersion: (v) => set((state) => ({ historyVersion: typeof v === "function" ? v(state.historyVersion) : v })),
  update: () => set((state) => ({ historyVersion: state.historyVersion + 1 })),
}));
