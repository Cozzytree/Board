import { AnchorLine, Box, PlainLine, type Board, type Line } from "@/board/index";
import Tool from "./tool";
import type { ToolCallback } from "../types";

class LineTool extends Tool {
   private newLine: Line | null = null;
   constructor(board: Board) {
      super(board);
   }

   cleanUp(): void {}

   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);
      if (this._board.modes.sm === "line:straight") {
         this.newLine = new PlainLine({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: mouse.x,
            top: mouse.y,
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
            left: mouse.x,
            top: mouse.y,
         });
      }
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);
      if (this.newLine) {
         this.newLine.Resize(
            mouse,
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

   pointerup(e: PointerEvent | MouseEvent, cb?: ToolCallback): void {
      if (this.newLine) {
         this._board.add(this.newLine);
         this._board.render();
         this.newLine.setCoords();
         this.newLine = null;
      }

      cb?.({ mode: "cursor", submode: "free" });
   }

   dblClick(e: PointerEvent | MouseEvent) {}

   onClick(e: PointerEvent | MouseEvent): void {}
}

export default LineTool;
