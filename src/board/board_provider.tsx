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
} from "lucide-react";
import * as React from "react";
import { Board, Rect, Shape } from "./index";
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
import { BoardContext } from "./board-context";
export type Theme = "dark" | "light" | "system";

const DEFAULT_CUSTOM_SHAPES: CustomShapeDef[] = [
  {
    name: "custom:cloud",
    icon: Cloud,
    shape: CloudShape,
  },
];

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
  onCursorMove,
  onDeleteShape,
  onThemeChange,
  isOwner,
  initialShapes,
  canvasLock = false,
}: {
  canvasLock?: boolean;
  initialShapes?: ShapeProps[];
  container?: React.RefObject<HTMLElement | null>;
  onCursorMove?: (e: EventData) => void;
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
  isOwner?: boolean;
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

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty("--background", background);
    root.style.setProperty("--foreground", foreground);
    root.style.setProperty("--popover", background);
  }, [background, foreground]);

  const handleThemeChange = React.useCallback((newTheme: "dark" | "light") => {
    setBoardThemeState(newTheme);
  }, []);

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
  const [, setVersion] = React.useState(0);
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
  ]);
  const [mode, setMode] = React.useState<{ m: modes; sm: submodes | null }>({
    m: "cursor",
    sm: "free",
  });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const borderRef = React.useRef<Board>(null);

  const STORAGE_KEY = "board_shapes";
  const VIEW_STORAGE_KEY = "board_view";

  /** Serialize all shapes in the store to localStorage */
  const saveShapesToStorage = React.useCallback((board: Board) => {
    const shapes: Record<string, any>[] = [];
    board.shapeStore.forEach((s) => {
      if (s.type !== "selection" && !s.groupId) {
        shapes.push(s.toObject());
      }
      return false;
    });
    try {
      const seen = new WeakSet();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(shapes, (_key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return undefined;
            seen.add(value);
          }
          return value;
        }),
      );
    } catch (err) {
      console.error("Failed to save shapes to localStorage", err);
    }
  }, []);

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
      if (!Array.isArray(data) || data.length === 0) return false;

      const restored: Shape[] = [];

      for (const obj of data) {
        const normalized = { ...obj } as Record<string, any>;

        // Backward compatibility: older Text shapes were saved without `type`.
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
        if (shape) {
          restored.push(shape);
        }
      }

      if (restored.length > 0) {
        // Use shapeStore.insert directly to avoid re-triggering shape:created
        board.shapeStore.insert(...restored);

        // Second pass: rebuild connections from serialized { shapeId, connected, anchor, coords }
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
              coords: conn.coords
                ? { x: conn.coords.x ?? 50, y: conn.coords.y ?? 50 }
                : { x: 50, y: 50 },
            });
          }
        }

        // Force connectionEvent refresh so line endpoints snap to current shape edges
        restored.forEach((shape) => {
          if (shape.type !== "line" && shape.connections.size() > 0) {
            const p = { x: shape.left, y: shape.top };
            shape.dragging(p, p);
          }
        });

        board.render();
        return true;
      }
    } catch (err) {
      console.error("Failed to load shapes from localStorage", err);
    }
    return false;
  }, []);

  const onDelete = React.useCallback(
    (shapes: Shape[]) => {
      onDeleteShape?.(shapes);
    },
    [onDeleteShape],
  );
  const onMouseUp = React.useCallback(() => {}, []);
  const onMouseMove = React.useCallback(
    (e: EventData) => {
      onCursorMove?.(e);
    },
    [onCursorMove],
  );

  // Keep a stable ref to the onShapesChanged callback
  const onShapesChangedRef = React.useRef(onShapesChanged);
  onShapesChangedRef.current = onShapesChanged;

  const hasInitialShapes = !!initialShapes;

  const onModeChange = React.useCallback((m: modes, sm: submodes) => {
    setMode({ m, sm });
  }, []);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    const newBoard = new Board({
      isLocked: isLockedCanvas,
      initialShapes: initialShapes || [],
      width,
      container: container?.current || undefined,
      foreground,
      background,
      height,
      canvas: canvasRef.current,
      snap: isSnap,
      hoverEffect: isHover,
      onModeChange: onModeChange,
      onActiveShape: (ac) => {
        setActiveShape(ac);
      },
      onZoom: (v) => {
        setZoom(v.scl * 100);
        setOffset([v.x, v.y]);
        saveViewToStorage(newBoard);
      },
      onScroll: (v) => {
        setOffset([v.x, v.y]);
        setZoom(v.scl * 100);
        saveViewToStorage(newBoard);
      },
      customShapes,
      onImageUpload,
    });

    // Notify parent that board is ready
    onBoardReady?.(newBoard);

    newBoard.on("mouseup", () => {
      onMouseUp();
      if (!hasInitialShapes) {
        if (onShapesChangedRef.current) {
          onShapesChangedRef.current(newBoard);
        } else {
          saveShapesToStorage(newBoard);
        }
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
    });
    newBoard.on("shape:resize", () => {});
    newBoard.on("shape:move", () => {});
    newBoard.on("shape:updated", () => {
      if (!hasInitialShapes) {
        if (onShapesChangedRef.current) {
          onShapesChangedRef.current(newBoard);
        } else {
          saveShapesToStorage(newBoard);
        }
      }
    });
    newBoard.on("shape:created", () => {
      if (!hasInitialShapes) {
        if (onShapesChangedRef.current) {
          onShapesChangedRef.current(newBoard);
        } else {
          saveShapesToStorage(newBoard);
        }
      }
    });

    // Load shapes - priority: initialShapes > localStorage > default
    if (initialShapes && initialShapes.length > 0) {
      void loadShapesFromProps(
        newBoard,
        initialShapes.map((s) => ({ id: s.id || crypto.randomUUID(), props: s })),
      );
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
    }

    // Save when shapes are deleted via keyboard
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || (e.ctrlKey && (e.key === "z" || e.key === "y"))) {
        if (!hasInitialShapes) {
          requestAnimationFrame(() => {
            if (onShapesChangedRef.current) {
              onShapesChangedRef.current(newBoard);
            } else {
              saveShapesToStorage(newBoard);
            }
          });
        }
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
    foreground,
    background,
    height,
    isHover,
    isSnap,
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
    borderRef.current.setSnap = isSnap;
    borderRef.current.hoverEffect = isHover;
  }, [isSnap, isHover]);

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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable)
        return;
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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable)
        return;
      if (mode.sm === "grab") return;
      e.preventDefault();
      handleModeChange("cursor", "grab");
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
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
    if (v) {
      borderRef.current.view.scl += 0.1;
    } else {
      borderRef.current.view.scl -= 0.1;
    }

    setZoom(borderRef.current.view.scl * 100);
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
      await saveLibraryItems(item);
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
    <ContextMenu>
      <BoardContext.Provider
        value={{
          foreground,
          background,
          theme: boardTheme,
          setTheme: handleThemeChange,
          setForeground,
          setBackground,
          onThemeChange,
          isOwner,
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
          update: () => {
            setVersion((v) => v + 1);
          },
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
        <ContextMenuTrigger>
          <canvas ref={canvasRef} style={{ width: width + "px", height: height + "px" }} />
        </ContextMenuTrigger>

        {children}
      </BoardContext.Provider>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setSnap(() => !isSnap);
          }}>
          snap {isSnap ? "off" : "on"}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setMinimal((prev) => !prev);
          }}>
          {isMinimal ? "show UI" : "minimal mode"}
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
      </ContextMenuContent>
    </ContextMenu>
  );
};

export { BoardProvider };
