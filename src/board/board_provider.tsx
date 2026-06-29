import * as React from "react";
import {
   BoxIcon,
   CircleIcon,
   DiamondIcon,
   EraserIcon,
   GrabIcon,
   Minus,
   MousePointer,
   PencilIcon,
   PentagonIcon,
   PlusIcon,
   Spline,
   TriangleIcon,
   TypeOutlineIcon,
   Star,
   Hexagon,
   ArrowRight,
   MessageSquare,
   type LucideIcon,
   Cloud,
   ImageIcon,
   CheckIcon,
} from "lucide-react";
import { debounce } from "@/lib/utils";
import Board from "./board.ts";
import Rect from "./shapes/rect.ts";
import Shape from "./shapes/shape.ts";
import ActiveSelection from "./shapes/active_selection.tsx"
import type { modes, submodes, CustomShapeDef, EventData, ShapeProps } from "./types";
import { generateShapeByShapeType } from "./utils/utilfunc";
import { saveLibraryItems } from "./utils/library_db";
import { loadShapesFromProps } from "@/lib/shape-loader";
import {
   ContextMenu,
   ContextMenuContent,
   ContextMenuItem,
   ContextMenuTrigger,
} from "@/components/ui/context-menu";
import CloudShape from "./shapes/paths/cloud_shape";
import { BoardContext, useBoard } from "./board-context";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { CURSOR_COLORS } from "./constants";

const isEditingText = (e: KeyboardEvent) => {
   const target = e.target as HTMLElement;
   if (target?.hasAttribute("data-board-text-edit")) return true;
   if (document.activeElement?.hasAttribute("data-board-text-edit")) return true;

   const tag = target?.tagName;
   return tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable;
};

export type Theme = "dark" | "light" | "system";

type CursorData = {
   x: number;
   y: number;
   id?: number;
   name?: string
}

type RemoteCursor = {
   clientId: number;
   cursor: CursorData;
}

const STORAGE_KEY = "board_shapes";
const VIEW_STORAGE_KEY = "board_view";
const STAT_STORAGE_KEY = "stat_key";

const DEFAULT_CUSTOM_SHAPES: CustomShapeDef[] = [
   {
      name: "custom:cloud",
      icon: Cloud,
      shape: CloudShape,
   },
];

let lastCursorUpdate = 0;
const THROTTLE_MS = 100;

const BoardProvider = ({
   container,
   height = window.innerHeight,
   width = window.innerWidth,
   customShapes = DEFAULT_CUSTOM_SHAPES,
   onImageUpload,
   theme,
   children,
   onShapesChanged,
   onBoardReady,
   skipLocalStorage = false,
   onDeleteShape,
   onThemeChange,
   initialShapes,
   canvasLock = false,
   provider
}: {
   provider?: HocuspocusProvider,
   canvasLock?: boolean;
   initialShapes?: ShapeProps[];
   container?: React.RefObject<HTMLElement | null>;
   theme?: Theme;
   width?: number;
   height?: number;
   customShapes?: CustomShapeDef[];
   onImageUpload?: (file: File) => Promise<string>;
   children?: React.ReactNode;
   /** Called whenever shapes change (create/move/delete). If provided, replaces localStorage persistence. */
   onShapesChanged?: (board: Board) => void;
   /** Called once when the board is first created. */
   onBoardReady?: (board: Board) => void;
   onDeleteShape?: (shapes: Shape[]) => void;
   /** When true, skips loading/saving from localStorage (used for room mode where sync is external). */
   skipLocalStorage?: boolean;
   onThemeChange?: (settings: {
      theme?: "dark" | "light";
      background?: string;
      foreground?: string;
   }) => void;
}) => {
   const [boardTheme, setBoardThemeState] = React.useState<"dark" | "light">(
      theme === "dark" || theme === "system" ? "dark" : "light",
   );
   const [isLockedCanvas, setIsLockedCanvas] = React.useState(canvasLock);
   const [background, setBackground] = React.useState(boardTheme === "dark" ? "#181818" : "#efefef");
   const [foreground, setForeground] = React.useState(boardTheme === "dark" ? "#cccccc" : "#202020");
   React.useEffect(() => {
      if (boardTheme === "dark") {
         setForeground("#cccccc");
         setBackground("#181818");
      } else {
         setForeground("#202020");
         setBackground("#efefef");
      }
   }, [boardTheme]);

   const handleThemeChange = React.useCallback((newTheme: "dark" | "light") => {
      setBoardThemeState(newTheme);
      onThemeChange?.({ theme: newTheme, background, foreground })
   }, []);

   const [isStat, setStat] = React.useState(() => {
      const val = localStorage.getItem(STAT_STORAGE_KEY);
      return Boolean(val) || false;
   });
   const [snapGrid, setSnapGrid] = React.useState(() => {
      try {
         return localStorage.getItem("grid_snap") === "true"
      } catch {
         return false;
      }
   });
   const [offset, setOffset] = React.useState<[number, number]>([0, 0]);
   const [zoom, setZoom] = React.useState(100);
   const [activeShape, setActiveShape] = React.useState<Shape | null>(null);
   const [isSnap, setSnapState] = React.useState(() => {
      try {
         return localStorage.getItem("board_snap") === "true";
      } catch {
         return false;
      }
   });
   const [isHover, setHoverState] = React.useState(() => {
      try {
         return localStorage.getItem("board_hover") === "true";
      } catch {
         return true;
      }
   });

   const setSnap = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
      setSnapState((prev) => {
         const next = typeof v === "function" ? v(prev) : v;
         try {
            localStorage.setItem("board_snap", String(next));
         } catch (err) {
            console.error(err);
         }
         setSnapGrid(() => false);
         return next;
      });
   }, []);
   const handleSetGridSnap = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
      setSnapState((prev) => {
         const next = typeof v === "function" ? v(prev) : v;
         try {
            localStorage.setItem("grid_snap", String(next));
         } catch (err) {
            console.error(err);
         }
         setSnapState(() => false);
         return next;
      });
   }, []);
   const setHover = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
      setHoverState((prev) => {
         const next = typeof v === "function" ? v(prev) : v;
         try {
            localStorage.setItem("board_hover", String(next));
         } catch (err) {
            console.error(err);
         }
         return next;
      });
   }, []);
   const [isMinimal, setMinimalState] = React.useState(() => {
      try {
         return localStorage.getItem("board_minimal") === "true";
      } catch {
         return false;
      }
   });
   const setMinimal = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
      setMinimalState((prev) => {
         const next = typeof v === "function" ? v(prev) : v;
         try {
            localStorage.setItem("board_minimal", String(next));
         } catch (err) {
            console.error(err);
         }
         return next;
      });
   }, []);
   const [tools, setTools] = React.useState<
      {
         mode: modes;
         I: LucideIcon | string;
         subMode: { sm: submodes; I: LucideIcon | string }[];
      }[]
   >([
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
            { sm: "path:arrow", I: ArrowRight },
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
         I: Spline,
         subMode: [
            { sm: "line:anchor", I: Spline },
            { sm: "line:straight", I: Minus },
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
      // {
      //    mode: "frame",
      //    I: VectorSquare,
      //    subMode: []
      // }
   ]);
   const [mode, setMode] = React.useState<{ m: modes; sm: submodes | null }>({
      m: "cursor",
      sm: "free",
   });
   const canvasRef = React.useRef<HTMLCanvasElement>(null);
   const canvas2Ref = React.useRef<HTMLCanvasElement>(null);
   const remoteCanvasRef = React.useRef<HTMLCanvasElement>(null);
   const borderRef = React.useRef<Board>(null);

   const undoStack = React.useRef<Record<string, any>[][]>([]);
   const redoStack = React.useRef<Record<string, any>[][]>([]);
   const isUndoing = React.useRef(false);
   const [historyVersion, setHistoryVersion] = React.useState(0);

   const serializeBoard = React.useCallback((board: Board) => {
      const shapes: Record<string, any>[] = [];
      board.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            shapes.push(s.toObject());
         }
         return false;
      });
      const seen = new WeakSet();
      const str = JSON.stringify(shapes, (_key, value) => {
         if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return undefined;
            seen.add(value);
         }
         return value;
      });
      return JSON.parse(str);
   }, []);

   const pushHistory = React.useCallback((board: Board) => {
      if (isUndoing.current) return;
      const newStateStr = JSON.stringify(serializeBoard(board));
      if (undoStack.current.length > 0) {
         const lastStateStr = JSON.stringify(undoStack.current[undoStack.current.length - 1]);
         if (newStateStr === lastStateStr) return;
      }
      undoStack.current.push(JSON.parse(newStateStr));
      if (undoStack.current.length > 50) {
         undoStack.current.shift();
      }
      redoStack.current = [];
      setHistoryVersion((v) => v + 1);
   }, [serializeBoard]);

   const restoreShapesFromData = React.useCallback((board: Board, data: Record<string, any>[]) => {
      board.shapeStore.clear();
      if (!Array.isArray(data) || data.length === 0) {
         board.renderImmediate();
         return false;
      }

      const restored: Shape[] = [];

      for (const obj of data) {
         const normalized = { ...obj } as Record<string, any>;
         if (
            !normalized.type &&
            typeof normalized.text === "string" &&
            typeof normalized.fontSize === "number" &&
            typeof normalized.left === "number" &&
            typeof normalized.top === "number" &&
            typeof normalized.width === "number" &&
            typeof normalized.height === "number" &&
            !Array.isArray(normalized.points) &&
            !normalized.svgPath &&
            !normalized.imageSrc
         ) {
            normalized.type = "text";
         }

         const shape = generateShapeByShapeType(normalized as any, board, board.ctx);
         if (shape) restored.push(shape);
      }

      if (restored.length > 0) {
         board.shapeStore.insert(...restored);

         for (const obj of data) {
            if (!obj.id || !Array.isArray(obj.connections) || obj.connections.length === 0) continue;
            const shape = board.shapeStore.get(obj.id);
            if (!shape) continue;

            for (const conn of obj.connections) {
               if (!conn.shapeId) continue;
               const targetShape = board.shapeStore.get(conn.shapeId);
               if (!targetShape) continue;
               shape.connections.add({
                  s: targetShape,
                  connected: conn.connected,
                  anchor: conn.anchor,
                  coords: conn.coords ? { x: conn.coords.x ?? 50, y: conn.coords.y ?? 50 } : { x: 50, y: 50 },
               });
            }
         }

         restored.forEach((shape) => {
            if (shape.type !== "line" && shape.connections.size() > 0) {
               const p = { x: shape.left, y: shape.top };
               shape.dragging(p, p);
            }
         });

         board.renderImmediate();
         return true;
      }
      return false;
   }, []);

   /** Serialize all shapes in the store to localStorage */
   const saveShapesToStorage = React.useCallback((board: Board) => {
      try {
         const serialized = serializeBoard(board);
         localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } catch (err) {
         console.error("Failed to save shapes to localStorage", err);
      }
   }, [serializeBoard]);

   const saveStatStateToLocalStorage = (v: boolean) => {
      try {
         localStorage.setItem(STAT_STORAGE_KEY, String(v));
      } catch {
         console.error("");
      }
   }

   const saveViewToStorage = React.useCallback((board: Board) => {
      try {
         localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(board.view));
      } catch (err) {
         console.error("Failed to save view to localStorage", err);
      }
   }, []);

   const loadViewFromStorage = React.useCallback((board: Board) => {
      try {
         const raw = localStorage.getItem(VIEW_STORAGE_KEY);
         if (!raw) return;
         const view = JSON.parse(raw);
         if (
            typeof view.x === "number" &&
            typeof view.y === "number" &&
            typeof view.scl === "number"
         ) {
            board.view.x = view.x;
            board.view.y = view.y;
            board.view.scl = view.scl;
         }
      } catch (err) {
         console.error("Failed to load view from localStorage", err);
      }
   }, []);

   /** Load shapes from localStorage and add them to the board */
   const loadShapesFromStorage = React.useCallback((board: Board) => {
      try {
         const raw = localStorage.getItem(STORAGE_KEY);
         if (!raw) return false;
         const data = JSON.parse(raw) as Record<string, any>[];
         return restoreShapesFromData(board, data);
      } catch (err) {
         console.error("Failed to load shapes from localStorage", err);
      }
      return false;
   }, [restoreShapesFromData]);

   const onDelete = React.useCallback(
      (shapes: Shape[]) => {
         onDeleteShape?.(shapes);
      },
      [onDeleteShape],
   );
   const onMouseUp = React.useCallback(() => { }, []);
   const onMouseMove = React.useCallback(
      (e: EventData) => {
         if (provider) {
            const now = Date.now();
            if (now - lastCursorUpdate < THROTTLE_MS) return;
            lastCursorUpdate = now;
            const x = e.e.x ?? 0;
            const y = e.e.y ?? 0;
            provider?.awareness?.setLocalStateField("cursor", {
               x, y, id: provider.awareness.clientID
            })
         }
      },
      [provider],
   );

   // Keep a stable ref to the onShapesChanged callback
   const onShapesChangedRef = React.useRef(onShapesChanged);
   onShapesChangedRef.current = onShapesChanged;

   const hasInitialShapes = !!initialShapes;

   const onModeChange = React.useCallback((m: modes, sm: submodes) => {
      setMode({ m, sm });
   }, []);

   const handleUndo = React.useCallback((board: Board) => {
      if (undoStack.current.length > 1) { // Leave the very first state intact
         isUndoing.current = true;
         const currentState = undoStack.current.pop()!;
         redoStack.current.push(currentState);
         const prevState = undoStack.current[undoStack.current.length - 1];
         restoreShapesFromData(board, prevState);
         saveShapesToStorage(board);
         isUndoing.current = false;
         setHistoryVersion((v) => v + 1);
      }
   }, [restoreShapesFromData])

   const handleRedo = React.useCallback((board: Board) => {
      if (redoStack.current.length > 0) {
         isUndoing.current = true;
         const nextState = redoStack.current.pop()!;
         undoStack.current.push(nextState);
         restoreShapesFromData(board, nextState);
         saveShapesToStorage(board);
         isUndoing.current = false;
         setHistoryVersion((v) => v + 1);
      }
   }, [restoreShapesFromData])

   React.useLayoutEffect(() => {
      if (!canvasRef.current || !canvas2Ref.current) return;

      const debouncedSaveViewToStorage = debounce((board: Board) => saveViewToStorage(board), 200);

      const newBoard = new Board({
         snapGrid,
         scrollEase: 1,
         isLocked: isLockedCanvas,
         initialShapes: initialShapes || [],
         width,
         container: container?.current || undefined,
         foreground,
         background,
         height,
         canvas: canvasRef.current,
         canvas2: canvas2Ref.current,
         canvasRemote: remoteCanvasRef.current,
         snap: isSnap,
         hoverEffect: isHover,
         onModeChange: onModeChange,
         onActiveShape: (ac) => {
            setActiveShape(ac);
         },
         onZoom: (v) => {
            setZoom(v.scl * 100);
            setOffset([v.x, v.y]);
            debouncedSaveViewToStorage(newBoard);
         },
         onScroll: (v) => {
            setOffset([v.x, v.y]);
            setZoom(v.scl * 100);
            debouncedSaveViewToStorage(newBoard);
         },
         customShapes,
         onImageUpload,
      });

      // Notify parent that board is ready
      onBoardReady?.(newBoard);

      newBoard.on("mouseup", (e) => {
         onMouseUp();
         if (e.e.target?.length) {
            setActiveShape(e.e.target[e.e.target.length - 1]);
         }
         pushHistory(newBoard);
         if (onShapesChangedRef.current) {
            onShapesChangedRef.current(newBoard);
         } else if (!hasInitialShapes) {
            saveShapesToStorage(newBoard);
         }
      });
      newBoard.on("mousedown", (e) => {
         if (e.e.target?.length) {
            setActiveShape(e.e.target[e.e.target.length - 1]);
         }
      });
      newBoard.on("mousemove", (e) => {
         onMouseMove(e);
      });
      newBoard.on("shape:delete", (e) => {
         onDelete(e.e.target || []);
         pushHistory(newBoard);
      });
      newBoard.on("shape:resize", () => { });
      newBoard.on("shape:move", () => { });
      newBoard.on("shape:updated", () => {
         if (onShapesChangedRef.current) {
            onShapesChangedRef.current(newBoard);
         } else if (!hasInitialShapes) {
            saveShapesToStorage(newBoard);
         }
      });
      newBoard.on("shape:created", () => {
         pushHistory(newBoard);
         if (onShapesChangedRef.current) {
            onShapesChangedRef.current(newBoard);
         } else if (!hasInitialShapes) {
            saveShapesToStorage(newBoard);
         }
      });

      // Load shapes - priority: initialShapes > localStorage > default
      if (initialShapes && initialShapes.length > 0) {
         void loadShapesFromProps(
            newBoard,
            initialShapes.map((s) => ({ id: s.id || crypto.randomUUID(), props: s })),
         ).then(() => {
            newBoard.renderImmediate();
            pushHistory(newBoard);
         });
      } else if (!skipLocalStorage) {
         loadViewFromStorage(newBoard);
         const loaded = loadShapesFromStorage(newBoard);
         if (!loaded) {
            const defaultShape = new Rect({
               ctx: newBoard.ctx,
               _board: newBoard,
               left: width / 2 - 50,
               top: height / 2 - 50,
               width: 100,
               height: 100,
            });
            newBoard.add(defaultShape);
         }
         pushHistory(newBoard);
      }

      // Save when shapes are deleted via keyboard and handle Undo/Redo
      const handleKeyDown = (e: KeyboardEvent) => {
         if (isEditingText(e)) return;

         if (e.ctrlKey && e.key === "z") {
            e.preventDefault();
            if (e.shiftKey) {
               // Redo (Ctrl+Shift+Z)
               handleRedo(newBoard);
               // if (redoStack.current.length > 0) {
               //    isUndoing.current = true;
               //    undoStack.current.push(serializeBoard(newBoard));
               //    const nextState = redoStack.current.pop()!;
               //    restoreShapesFromData(newBoard, nextState);
               //    saveShapesToStorage(newBoard);
               //    isUndoing.current = false;
               // }
            } else {
               // Undo (Ctrl+Z)
               handleUndo(newBoard);
               // if (undoStack.current.length > 1) { // Leave the very first state intact
               //    isUndoing.current = true;
               //    const currentState = undoStack.current.pop()!;
               //    redoStack.current.push(currentState);
               //    const prevState = undoStack.current[undoStack.current.length - 1];
               //    restoreShapesFromData(newBoard, prevState);
               //    saveShapesToStorage(newBoard);
               //    isUndoing.current = false;
               // }
            }
         } else if (e.ctrlKey && e.key === "y") {
            e.preventDefault();
            // Redo (Ctrl+Y)
            handleRedo(newBoard);
            // if (redoStack.current.length > 0) {
            //    isUndoing.current = true;
            //    undoStack.current.push(serializeBoard(newBoard));
            //    const nextState = redoStack.current.pop()!;
            //    restoreShapesFromData(newBoard, nextState);
            //    saveShapesToStorage(newBoard);
            //    isUndoing.current = false;
            // }
         } else if (e.key === "Delete") {
            requestAnimationFrame(() => {
               if (onShapesChangedRef.current) {
                  onShapesChangedRef.current(newBoard);
               } else if (!hasInitialShapes) {
                  saveShapesToStorage(newBoard);
               }
            });
         }
      };
      document.addEventListener("keydown", handleKeyDown);

      borderRef.current = newBoard;

      return () => {
         document.removeEventListener("keydown", handleKeyDown);
         newBoard.clean();
      };
   }, [
      width,
      height,
      onModeChange,
      onMouseUp,
      customShapes,
      saveShapesToStorage,
      loadShapesFromStorage,
      container,
      hasInitialShapes,
      initialShapes,
      onBoardReady,
      onDelete,
      onImageUpload,
      onMouseMove,
      saveViewToStorage,
      skipLocalStorage,
   ]);

   React.useEffect(() => {
      if (!borderRef.current) return;
      borderRef.current.snap = isSnap;
      borderRef.current.hoverEffect = isHover;
      borderRef.current.foreground = foreground;
      borderRef.current.background = background;
      borderRef.current.snapGrid = snapGrid;
   }, [isSnap, isHover, foreground, background, snapGrid]);

   const handleModeChange = React.useCallback((m: modes, sm: submodes | null) => {
      if (!borderRef.current) return;
      setMode({ m, sm });
      borderRef.current.setMode = { m, sm, originUi: true };

      setTools((prev) => {
         const tool = prev.find((t) => t.mode === m);
         if (!tool) return prev;

         const submIndex = tool.subMode.findIndex((sb) => sb.sm === sm);
         if (submIndex === -1) return prev; // submode not in toolbar — still forwarded above

         const subm = tool.subMode[submIndex];

         tool.I = subm.I;

         if (submIndex > 0) {
            [tool.subMode[submIndex], tool.subMode[0]] = [tool.subMode[0], tool.subMode[submIndex]];
         }

         return [...prev];
      });
   }, []);

   // Keyboard shortcuts
   React.useEffect(() => {
      const SHORTCUT_MAP: Record<string, { mode: modes; defaultSm: submodes | null }> = {
         v: { mode: "cursor", defaultSm: "free" },
         r: { mode: "shape", defaultSm: "rect" },
         o: { mode: "shape", defaultSm: "circle" },
         d: { mode: "draw", defaultSm: "pencil" },
         l: { mode: "line", defaultSm: "line:anchor" },
         t: { mode: "text", defaultSm: null },
         e: { mode: "eraser", defaultSm: null },
         i: { mode: "image", defaultSm: null },
      };

      const NUMBER_KEYS = ["1", "2", "3", "4", "5", "6", "7"];

      const handleShortcut = (e: KeyboardEvent) => {
         if (isEditingText(e)) return;
         if (e.ctrlKey || e.metaKey || e.altKey) return;

         const key = e.key.toLowerCase();

         const numIdx = NUMBER_KEYS.indexOf(key);
         if (numIdx !== -1 && numIdx < tools.length) {
            const tool = tools[numIdx];
            const sm = tool.subMode.length > 0 ? tool.subMode[0].sm : null;
            handleModeChange(tool.mode, sm);
            return;
         }

         const mapping = SHORTCUT_MAP[key];
         if (!mapping) return;

         const { mode: targetMode, defaultSm } = mapping;

         if (borderRef.current && mode.m === targetMode) {
            const tool = tools.find((t) => t.mode === targetMode);
            if (tool && tool.subMode.length > 1) {
               const currentIdx = tool.subMode.findIndex((s) => s.sm === mode.sm);
               const nextIdx = (currentIdx + 1) % tool.subMode.length;
               handleModeChange(targetMode, tool.subMode[nextIdx].sm);
               return;
            }
         }

         handleModeChange(targetMode, defaultSm);
      };

      document.addEventListener("keydown", handleShortcut);
      return () => document.removeEventListener("keydown", handleShortcut);
   }, [mode, tools, handleModeChange]);

   // Space held -> grab mode (only from cursor mode); release -> back to cursor
   React.useEffect(() => {
      if (mode.m !== "cursor") return;

      const onKeyDown = (e: KeyboardEvent) => {
         if (e.code !== "Space" || e.repeat) return;
         if (isEditingText(e)) return;
         if (mode.sm === "grab") return;
         e.preventDefault();
         handleModeChange("cursor", "grab");
      };

      const onKeyUp = (e: KeyboardEvent) => {
         if (e.code !== "Space") return;
         if (isEditingText(e)) return;
         handleModeChange("cursor", "free");
      };

      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);
      return () => {
         document.removeEventListener("keydown", onKeyDown);
         document.removeEventListener("keyup", onKeyUp);
      };
   }, [mode, handleModeChange]);

   const handleZoom = React.useCallback((v: boolean) => {
      if (!borderRef.current) return;

      let nextScl = borderRef.current.view.scl;
      if (v) {
         nextScl += 0.1;
      } else {
         nextScl -= 0.1;
      }

      if (nextScl < 0.1) nextScl = 0.1;
      if (nextScl > 5) nextScl = 5;

      borderRef.current.view.scl = nextScl;

      // Keep targetView in sync so wheel scroll doesn't snap back
      if ((borderRef.current as any).targetView) {
         (borderRef.current as any).targetView.scl = nextScl;
      }

      setZoom(nextScl * 100);
      borderRef.current.render();
   }, []);

   const handleCenter = React.useCallback(() => {
      if (!borderRef.current) return;

      [borderRef.current.view.x, borderRef.current.view.y] = [0, 0];
      borderRef.current.render();
      setOffset([0, 0]);
   }, []);

   const importLibrary = React.useCallback((library: any) => {
      if (library?.type !== "board-library" || !Array.isArray(library.libraryItems)) {
         console.error("Invalid library format");
         return;
      }

      const newShapes: { sm: submodes; I: LucideIcon | string }[] = [];

      library.libraryItems.forEach((item: any) => {
         if (item.name && item.svg && borderRef.current) {
            // Register the SVG as a custom shape
            const success = borderRef.current.registerSvgIcon(item.name, item.svg);
            if (success) {
               newShapes.push({ sm: item.name as submodes, I: item.svg });
            }
         }
      });

      if (newShapes.length > 0) {
         setTools((prev) => {
            const newTools = [...prev];
            const shapeToolIndex = newTools.findIndex((t) => t.mode === "shape");
            if (shapeToolIndex !== -1) {
               const shapeTool = { ...newTools[shapeToolIndex] };
               shapeTool.subMode = [...shapeTool.subMode, ...newShapes];
               newTools[shapeToolIndex] = shapeTool;
            }
            return newTools;
         });
      }
   }, []);

   const exportBoardAsLibrary = React.useCallback(async () => {
      if (!borderRef.current) return;

      const board = borderRef.current;
      const elements: Record<string, any>[] = [];

      board.shapeStore.forEach((shape) => {
         if (shape.type !== "selection") {
            elements.push(shape.toObject());
         }
         return false;
      });

      if (elements.length === 0) {
         console.warn("Nothing to export: board has no shapes.");
         return;
      }

      const created = Date.now();
      const item = {
         id: `board-${created}`,
         status: "published",
         created,
         name: `Board ${new Date(created).toLocaleString()}`,
         elements,
      };

      const payload = {
         type: "board-library",
         version: 1,
         source: "Board",
         libraryItems: [item],
      };

      try {
         await saveLibraryItems({
            elements: [],
            id: item.id,
         });
      } catch (err) {
         console.error("Failed to save board library item locally", err);
      }

      try {
         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
         const url = URL.createObjectURL(blob);
         const link = document.createElement("a");
         link.href = url;
         link.download = `board-library-${created}.json`;
         document.body.appendChild(link);
         link.click();
         link.remove();
         URL.revokeObjectURL(url);
      } catch (err) {
         console.error("Failed to download board library file", err);
      }
   }, []);

   return (
      <>
         <ContextMenu>
            <BoardContext.Provider
               value={{
                  snapGrid,
                  setSnapGrid: handleSetGridSnap,
                  undoStack: undoStack.current,
                  redoStack: redoStack.current,
                  historyVersion,
                  undo() {
                     if (!borderRef.current) return;
                     handleUndo(borderRef.current);
                  },
                  redo() {
                     if (!borderRef.current) return;
                     handleRedo(borderRef.current);
                  },
                  stat: isStat,
                  setStat: (v) => {
                     setStat(v);
                     saveStatStateToLocalStorage(v);
                  },
                  foreground,
                  background,
                  theme: boardTheme,
                  setTheme: handleThemeChange,
                  setForeground,
                  setBackground,
                  onThemeChange,
                  setActiveShape: (s) => {
                     setActiveShape(s);
                  },
                  canvas: borderRef.current,
                  activeShape,
                  tools,
                  mode,
                  setMode: handleModeChange,
                  hover: isHover,
                  setHover: (h) => {
                     setHover(h);
                  },

                  snap: isSnap,
                  setSnap: (s) => {
                     setSnap(s);
                  },
                  update: () => { },
                  importLibrary,

                  // Composable UI state
                  zoom,
                  offset,
                  isMinimal,
                  setMinimal,
                  handleZoom,
                  handleCenter,
                  exportBoardAsLibrary,
                  canvasRef,
                  width,
                  height,
               }}>
               {provider && borderRef.current &&
                  <RemoteStateManager provider={provider} view={borderRef.current.view} />
               }
               <ContextMenuTrigger asChild>
                  <div className="touch-none" style={{ position: 'relative', width: width + "px", height: height + "px" }}>
                     <canvas
                        ref={remoteCanvasRef}
                        id="board-remote-canvas"
                        style={{ width: width + "px", height: height + "px", position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 15 }}
                     />
                     <canvas
                        ref={canvas2Ref}
                        id="board-overlay-canvas"
                        style={{ width: width + "px", height: height + "px", position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 5 }}
                     />
                     <canvas
                        ref={canvasRef}
                        style={{ width: width + "px", height: height + "px", position: "absolute", left: 0, top: 0, zIndex: 10 }}
                     />
                  </div>
               </ContextMenuTrigger>

               {children}
            </BoardContext.Provider>
            <ContextMenuContent>
               <ContextMenuItem
                  onClick={() => {
                     setSnapGrid(v => !v);
                     // borderRef.current?.renderImmediate();
                  }}
               >
                  {snapGrid && <CheckIcon />} Toggle grid
               </ContextMenuItem>
               <ContextMenuItem
                  onClick={() => {
                     setSnap(() => !isSnap);
                  }}>
                  {isSnap && <CheckIcon />}  snap {isSnap ? "off" : "on"}
               </ContextMenuItem>
               <ContextMenuItem
                  onClick={() => {
                     setMinimal((prev) => !prev);
                  }}>
                  {isMinimal && <CheckIcon />} Minimal mode
               </ContextMenuItem>
               <ContextMenuItem
                  onClick={() => {
                     setHover((prev) => !prev);
                  }}>
                  hover {isHover ? "off" : "on"}
               </ContextMenuItem>
               <ContextMenuItem
                  onClick={() => {
                     void exportBoardAsLibrary();
                  }}>
                  make board library
               </ContextMenuItem>
               <ContextMenuItem onClick={() => {
                  setStat(!isStat);
                  saveStatStateToLocalStorage(!isStat);
               }}>
                  {isStat && <CheckIcon />} Stats
               </ContextMenuItem>
            </ContextMenuContent>
         </ContextMenu >
      </>
   );
};

function getColorForClient(clientId: number): string {
   return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

function RemoteStateManager({ view, provider }: { provider: HocuspocusProvider, view: { x: number, y: number, scl: number } }) {
   const [cursors, setCursors] = React.useState<RemoteCursor[]>([]);
   const { activeShape, canvas } = useBoard();

   React.useEffect(() => {
      if (!provider) return;
      if (!activeShape) {
         provider.awareness?.setLocalStateField("selection", { ids: [] });
         return;
      }

      if (activeShape instanceof ActiveSelection) {
         const ids = activeShape.shapes.map((s) => s.s.ID());
         provider.awareness?.setLocalStateField("selection", { ids })
      } else {
         provider.awareness?.setLocalStateField("selection", {
            ids: [activeShape.ID()]
         })
      }
   }, [activeShape])


   React.useEffect(() => {
      if (!provider || !canvas) return;
      const updateCursors = () => {
         const states = provider.awareness?.getStates();
         const localID = provider.awareness?.clientID;
         const remoteCursors: RemoteCursor[] = [];
         if (!states) return;

         states.forEach((state, clientId) => {
            if (clientId === localID) return;
            if (state.cursor && typeof state.cursor.x === "number") {
               remoteCursors.push({
                  clientId,
                  cursor: state.cursor as CursorData
               });
            }

            if (state?.selection && state.selection?.ids && state.selection.ids.length > 0) {
               canvas.remoteSelections.set(clientId, {
                  color: getColorForClient(clientId),
                  shapeIds: state.selection.ids as string[],
               });
            } else {
               canvas.remoteSelections.delete(clientId);
            }
         })

         for (const [clientID] of canvas.remoteSelections.entries()) {
            if (!states.has(clientID)) {
               canvas.remoteSelections.delete(clientID);
            }
         }

         canvas.renderRemoteSelectionsAsync();
         setCursors(remoteCursors);
      }

      provider.awareness?.on("change", updateCursors);
      return () => {
         provider.awareness?.off("change", updateCursors);
      }
   }, [provider, canvas])

   return <CursorOverlay cursors={cursors} view={view} />
}

function CursorOverlay({ cursors, view }: { cursors: RemoteCursor[], view?: { x: number, y: number, scl: number } }) {
   if (cursors.length === 0) return;

   return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
         {cursors.map(({ clientId, cursor }) => {
            const color = getColorForClient(clientId);
            const screenX = view ? cursor.x * view.scl + view.x : cursor.x;
            const screenY = view ? cursor.y * view.scl + view.y : cursor.y;

            return (
               <div
                  key={clientId}
                  className="absolute"
                  style={{
                     left: screenX,
                     top: screenY,
                     transition: "left 80ms linear, top 80ms linear",
                  }}>
                  <svg
                     width="16"
                     height="20"
                     viewBox="0 0 16 20"
                     fill="none"
                     style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>
                     <path
                        d="M0.928711 0.514648L14.9287 8.51465L7.92871 10.5146L4.92871 18.5146L0.928711 0.514648Z"
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                        strokeLinejoin="round"
                     />
                  </svg>
                  <div
                     className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
                     style={{
                        backgroundColor: color,
                        color: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                     }}>
                     {cursor.name || `User ${clientId.toString().slice(-4)}`}
                  </div>
               </div>
            );
         })}
      </div>
   );
}

export { BoardProvider };
