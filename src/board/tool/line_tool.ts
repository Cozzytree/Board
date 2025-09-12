import { AnchorLine, Box, LineCurve, PlainLine, type Board, type Line } from "@/board/index";
import type { ToolCallback, ToolEventData } from "../types";
import Tool from "./tool";

class LineTool extends Tool {
   private newLine: Line | null = null;

   constructor(board: Board) {
      super(board);
   }

   cleanUp(): void {}

   pointerDown({ p }: ToolEventData): void {
      if (this._board.modes.sm === "line:straight") {
         this.newLine = new PlainLine({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            lineType: "curve",
            fill: "white",
         });
      } else if (this._board.modes.sm === "line:curve") {
         this.newLine = new LineCurve({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            lineType: "curve",
            fill: "white",
         });
      } else {
         this.newLine = new AnchorLine({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 1.5, y: 0 },
               { x: 1.5, y: 3 },
               { x: 3, y: 3 },
            ],
            left: p.x,
            top: p.y,
         });
      }
   }

   pointermove({ p }: ToolEventData): void {
      if (this.newLine) {
         this.newLine.Resize(
            p,
            new Box({
               x1: this.newLine.left,
               y1: this.newLine.top,
               x2: this.newLine.left + this.newLine.width,
               y2: this.newLine.top + this.newLine.height,
            }),
            "br",
         );
         this.draw(this.newLine);
      }
   }

   pointerup(e: ToolEventData, cb?: ToolCallback): void {
      if (this.newLine) {
         this._board.add(this.newLine);
         this._board.render();
         this.newLine.setCoords();
         this.newLine.mouseup({ e: { point: e.p } });
         this.newLine = null;
      }

      cb?.({ mode: "cursor", submode: "free" });
   }

   dblClick() {}

   onClick(): void {}
}

export default LineTool;
