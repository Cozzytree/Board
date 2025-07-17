import * as React from "react";
import type { modes, submodes } from "./types";
import { Board } from "./index";
import Toolbar from "./components/toolbar";

type ContextProps = {
   mode: { m: modes; sm: submodes };
   setMode: (m: modes, sm: submodes) => void;
};

const BoardContext = React.createContext<ContextProps | undefined>(undefined);

const BoardProvider = ({
   height = window.innerHeight,
   width = window.innerWidth,
}: {
   width?: number;
   height?: number;
}) => {
   const [mode, setMode] = React.useState<{ m: modes; sm: submodes }>({
      m: "cursor",
      sm: "free",
   });
   const borderRef = React.useRef<Board>(null);
   const canvasRef = React.useRef<HTMLCanvasElement>(null);

   React.useEffect(() => {
      if (!canvasRef.current) return;
      const newBoard = new Board({
         width,
         height,
         canvas: canvasRef.current,
         onModeChange: (m, sm) => {
            setMode({ m, sm });
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
   };

   return (
      <BoardContext.Provider value={{ mode, setMode: handleModeChange }}>
         <canvas
            ref={canvasRef}
            style={{ width: width + "px", height: height + "px" }}
         />
         <div className="pointer-events-auto z-50 w-fit fixed top-4 left-1/2 -translate-x-[50%] flex justify-center">
            <Toolbar />
         </div>
      </BoardContext.Provider>
   );
};

const useBoard = () => {
   const ctx = React.useContext(BoardContext);
   if (!ctx) throw new Error("board ctx must be used within boadProvider");
   return ctx;
};

export { BoardProvider, useBoard };
