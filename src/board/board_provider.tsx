import {
  ArrowLeft,
  BoxIcon,
  CircleIcon,
  DiamondIcon,
  EraserIcon,
  GrabIcon,
  Minus,
  MinusIcon,
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
import ShapeOptions from "./components/shapeoptions";
import Toolbar from "./components/toolbar";
import { LibrarySidebar } from "./components/library_sidebar";
import { Board, Rect, Shape } from "./index";
import type { EventData, modes, submodes, CustomShapeDef } from "./types";
import { generateShapeByShapeType } from "./utils/utilfunc";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import CloudShape from "./shapes/paths/cloud_shape";
import { BoardContext } from "./board-context";

const DEFAULT_CUSTOM_SHAPES: CustomShapeDef[] = [
  {
    name: "custom:cloud",
    icon: Cloud,
    shape: CloudShape,
  },
];

const BoardProvider = ({
  height = window.innerHeight,
  width = window.innerWidth,
  customShapes = DEFAULT_CUSTOM_SHAPES,
  onImageUpload,
}: {
  width?: number;
  height?: number;
  customShapes?: CustomShapeDef[];
  onImageUpload?: (file: File) => Promise<string>;
}) => {
  const [offset, setOffset] = React.useState([0, 0]);
  const [zoom, setZoom] = React.useState(100);
  const [activeShape, setActiveShape] = React.useState<Shape | null>(null);
  const [isSnap, setSnapState] = React.useState(() => {
    try { return localStorage.getItem("board_snap") === "true"; } catch { return false; }
  });
  const [isHover, setHoverState] = React.useState(() => {
    try { return localStorage.getItem("board_hover") === "true"; } catch { return true; }
  });

  const setSnap = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setSnapState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem("board_snap", String(next)); } catch { }
      return next;
    });
  }, []);
  const setHover = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setHoverState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem("board_hover", String(next)); } catch { }
      return next;
    });
  }, []);
  const [isMinimal, setMinimalState] = React.useState(() => {
    try { return localStorage.getItem("board_minimal") === "true"; } catch { return false; }
  });
  const setMinimal = React.useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setMinimalState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem("board_minimal", String(next)); } catch { }
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

  /** Serialize all shapes in the store to localStorage */
  const saveShapesToStorage = React.useCallback((board: Board) => {
    const shapes: Record<string, any>[] = [];
    board.shapeStore.forEach((s) => {
      if (s.type !== "selection") {
        shapes.push(s.toObject());
      }
      return false;
    });
    try {
      const seen = new WeakSet();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes, (_key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) return undefined;
          seen.add(value);
        }
        return value;
      }));
    } catch (err) {
      console.error("Failed to save shapes to localStorage", err);
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
        const shape = generateShapeByShapeType(obj as any, board, board.ctx);
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
              coords: conn.coords,
            });
          }
        }

        board.render();
        return true;
      }
    } catch (err) {
      console.error("Failed to load shapes from localStorage", err);
    }
    return false;
  }, []);

  const onMouseUp = React.useCallback(() => { }, []);

  const onModeChange = React.useCallback((m: modes, sm: submodes) => {
    setMode({ m, sm });
  }, []);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const newBoard = new Board({
      width,
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
      },
      onScroll: (v) => {
        setOffset([v.x, v.y]);
        setZoom(v.scl * 100);
      },
      customShapes,
      onImageUpload,
    });

    newBoard.on("mouseup", () => {
      onMouseUp();
      saveShapesToStorage(newBoard);
    });
    newBoard.on("mousedown", (e) => {
      if (e.e.target?.length) {
        setActiveShape(e.e.target[e.e.target.length - 1]);
      }
    });
    newBoard.on("mousemove", () => { });
    newBoard.on("shape:resize", () => { });
    newBoard.on("shape:move", () => { });
    newBoard.on("shape:created", () => {
      saveShapesToStorage(newBoard);
    });

    // Load saved shapes or create a default one
    const loaded = loadShapesFromStorage(newBoard);
    if (!loaded) {
      // Create a default rect so the canvas isn't empty
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

    // Save when shapes are deleted via keyboard
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || (e.ctrlKey && (e.key === "z" || e.key === "y"))) {
        // Small delay to let the board process the key first
        requestAnimationFrame(() => saveShapesToStorage(newBoard));
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    borderRef.current = newBoard;

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      newBoard.clean();
    };
  }, [width, height, isHover, isSnap, onModeChange, onMouseUp, customShapes, saveShapesToStorage, loadShapesFromStorage]);

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
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
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

  const handleCenter = () => {
    if (!borderRef.current) return;

    [borderRef.current.view.x, borderRef.current.view.y] = [0, 0];
    borderRef.current.render();
    setOffset([0, 0]);
  };

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

  return (
    <ContextMenu>
      <BoardContext.Provider
        value={{
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
        }}>
        <div className="w-32 bg-amber-100" />

        <ContextMenuTrigger>
          <canvas ref={canvasRef} style={{ width: width + "px", height: height + "px" }} />
        </ContextMenuTrigger>
        <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center">
          {!isMinimal && <Toolbar />}
        </div>
        {!isMinimal && <LibrarySidebar />}

        <div className="fixed w-fit z-50 md:left-5 md:top-5 right-15 bottom-5">
          {(Math.abs(offset[0]) > 100 || Math.abs(offset[1]) > 100) && (
            <Button
              className="cursor-pointer"
              onClick={handleCenter}
              variant={"secondary"}
              size={"xs"}>
              <ArrowLeft width={10} /> <span className="hidden md:block">Back to center</span>
            </Button>
          )}
        </div>

        <div className="z-50 fixed left-4 bottom-5 flex items-center gap-2">
          <Button
            onClick={() => {
              handleZoom(true);
            }}
            variant={"secondary"}
            size={"xs"}
            className="cursor-pointer">
            <PlusIcon />
          </Button>
          <span className="text-sm">{zoom.toFixed(0)} %</span>
          <Button
            onClick={() => {
              handleZoom(false);
            }}
            variant={"secondary"}
            size={"xs"}
            className="cursor-pointer">
            <MinusIcon />
          </Button>
        </div>

        {!isMinimal && activeShape && <ShapeOptions />}
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
      </ContextMenuContent>
    </ContextMenu>
  );
};

export { BoardProvider };
