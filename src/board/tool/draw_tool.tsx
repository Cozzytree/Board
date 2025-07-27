import { SimplePath, type Board } from "@/board/index";
import Tool from "./tool";
import type { ToolEventData } from "../types";

class DrawTool extends Tool {
   private shape: SimplePath | null = null;

   constructor(board: Board) {
      super(board);
      this._board = board;
   }

   pointerDown({ p }: ToolEventData): void {
      this.shape = new SimplePath({
         left: p.x,
         top: p.y,
         _board: this._board,
         ctx: this._board.ctx,
      });
   }

   pointermove({ p }: ToolEventData): void {
      if (!this.shape) return;

      this.shape.set("points", [
         ...this.shape.get("points"),
         { x: p.x - this.shape.left, y: p.y - this.shape.top },
      ]);
      this.draw(this.shape);
   }

   cleanUp(): void {}

   pointerup(): void {
      if (!this.shape) return;

      this._board.add(this.shape);
      this._board.discardActiveShapes();
      this.shape.setCoords();
      this._board.render();

      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);

      this.shape = null;
   }

   dblClick() {}

   onClick(): void {}
}

export default DrawTool;
