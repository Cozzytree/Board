import * as React from "react";
import type { modes, submodes } from "./types";
import { Board, Shape } from "./index";
import Toolbar from "./components/toolbar";
import {
   BoxIcon,
   CircleIcon,
   DiamondIcon,
   GrabIcon,
   Minus,
   MousePointer,
   PencilIcon,
   PentagonIcon,
   PlusIcon,
   Spline,
   TriangleIcon,
   type LucideIcon,
} from "lucide-react";
import ShapeOptions from "./components/shapeoptions";

type ContextProps = {
   mode: { m: modes; sm: submodes };
   setMode: (m: modes, sm: submodes) => void;
   tools: {
      mode: modes;
      I: LucideIcon;
      subMode: { sm: submodes; I: LucideIcon }[];
   }[];
   activeShape: Shape | null;
   canvas: Board | null;
   setActiveShape: (v: Shape | null) => void;
};

const BoardContext = React.createContext<ContextProps | undefined>(undefined);

const BoardProvider = ({
   height = window.innerHeight,
   width = window.innerWidth,
}: {
   width?: number;
   height?: number;
}) => {
   const [activeShape, setActiveShape] = React.useState<Shape | null>(null);
   const [tools, setTools] = React.useState<
      {
         mode: modes;
         I: LucideIcon;
         subMode: { sm: submodes; I: LucideIcon }[];
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
   ]);
   const [mode, setMode] = React.useState<{ m: modes; sm: submodes }>({
      m: "cursor",
      sm: "free",
   });
   const canvasRef = React.useRef<HTMLCanvasElement>(null);
   const borderRef = React.useRef<Board>(null);

   React.useEffect(() => {
      if (!canvasRef.current) return;
      const newBoard = new Board({
         width,
         height,
         canvas: canvasRef.current,
         onModeChange: (m, sm) => {
            setMode({ m, sm });
         },
         onMouseUp: () => {
            const active = borderRef.current?.getActiveShapes();
            if (active?.length) {
               setActiveShape(active[0]);
            } else {
               setActiveShape(null);
            }
         },
      });
      borderRef.current = newBoard;

      return () => {
         newBoard.clean();
      };
   }, []);

   const handleModeChange = (m: modes, sm: submodes) => {
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
   };

   return (
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
         }}>
         <canvas ref={canvasRef} style={{ width: width + "px", height: height + "px" }} />
         <div className="pointer-events-auto z-50 right-8 top-1/2 w-fit -translate-y-[50%] fixed flex justify-center">
            <Toolbar />
         </div>

         {activeShape && (
            <div className="z-50 fixed top-5 left-1/2 -translate-x-[50%]">
               <ShapeOptions />
            </div>
         )}
      </BoardContext.Provider>
   );
};

const useBoard = () => {
   const ctx = React.useContext(BoardContext);
   if (!ctx) throw new Error("board ctx must be used within boadProvider");
   return ctx;
};

export { BoardProvider, useBoard };
