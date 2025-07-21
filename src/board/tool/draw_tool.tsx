import { Pointer, SimplePath, type Board } from "@/board/index";
import type { ToolCallback, Point } from "../types";
import Tool from "./tool";

class DrawTool extends Tool {
   private points: Point[] = [];
   private shape: SimplePath | null = null;

   constructor(board: Board) {
      super(board);
      this._board = board;
   }

   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);

      this.points.push(new Pointer(mouse));
      this.shape = new SimplePath({
         _board: this._board,
         ctx: this._board.ctx,
      });
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      if (!this.shape) return;
      const mouse = this._board.getTransFormedCoords(e);

      this.shape.set("points", [...this.shape.get("points"), mouse]);
      this.draw(this.shape);
   }

   cleanUp(): void {}

   pointerup(e: PointerEvent | MouseEvent, cb?: ToolCallback): void {
      if (!this.shape) return;

      this._board.add(this.shape);
      this._board.render();

      this._board.ctx2.clearRect(
         0,
         0,
         this._board.canvas2.width,
         this._board.canvas2.height,
      );

      this.points = [];
      this.shape = null;
   }
}

export default DrawTool;
