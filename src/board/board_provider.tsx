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
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import ShapeOptions from "./components/shapeoptions";
import Toolbar from "./components/toolbar";
import { Board, Shape } from "./index";
import type { modes, submodes } from "./types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";

type ContextProps = {
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
};

const BoardContext = React.createContext<ContextProps | undefined>(undefined);

const BoardProvider = ({
  height = window.innerHeight,
  width = window.innerWidth,
}: {
  width?: number;
  height?: number;
}) => {
  const [offset, setOffset] = React.useState([0, 0]);
  const [zoom, setZoom] = React.useState(100);
  const [activeShape, setActiveShape] = React.useState<Shape | null>(null);
  const [isSnap, setSnap] = React.useState(false);
  const [isHover, setHover] = React.useState(false);
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
  ]);
  const [mode, setMode] = React.useState<{ m: modes; sm: submodes | null }>({
    m: "cursor",
    sm: "free",
  });
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const borderRef = React.useRef<Board>(null);

  const onMouseUp = React.useCallback(() => {
    const active = borderRef.current?.getActiveShapes();
    if (active) {
      setActiveShape(active);
    } else {
      setActiveShape(null);
    }
  }, []);

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
      onMouseUp: onMouseUp,
      onZoom: (v) => {
        setZoom(v.scl * 100);
        setOffset([v.x, v.y]);
      },
      onScroll: (v) => {
        setOffset([v.x, v.y]);
        setZoom(v.scl * 100);
      },
    });
    borderRef.current = newBoard;

    return () => {
      newBoard.clean();
    };
  }, [width, height, isHover]);

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
      if (submIndex == -1) return prev;

      const subm = tool.subMode[submIndex];

      tool.I = subm.I;

      if (submIndex > 0) {
        [tool.subMode[submIndex], tool.subMode[0]] = [tool.subMode[0], tool.subMode[submIndex]];
      }

      return [...prev];
    });
  }, []);

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
        }}>
        <div className="w-32 bg-amber-100" />

        <ContextMenuTrigger>
          <canvas ref={canvasRef} style={{ width: width + "px", height: height + "px" }} />
        </ContextMenuTrigger>
        <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center">
          <Toolbar />
        </div>

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

        {activeShape && <ShapeOptions />}
      </BoardContext.Provider>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setSnap(() => !isSnap);
          }}>
          snap {isSnap ? "off" : "on"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

const useBoard = () => {
  const ctx = React.useContext(BoardContext);
  if (!ctx) throw new Error("board ctx must be used within boadProvider");
  return ctx;
};

export { BoardProvider, useBoard };
