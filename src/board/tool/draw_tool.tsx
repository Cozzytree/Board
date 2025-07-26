import { SimplePath, type Board } from "@/board/index";
import Tool from "./tool";

class DrawTool extends Tool {
   private shape: SimplePath | null = null;

   constructor(board: Board) {
      super(board);
      this._board = board;
   }

   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);

      this.shape = new SimplePath({
         left: mouse.x,
         top: mouse.y,
         _board: this._board,
         ctx: this._board.ctx,
      });
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      if (!this.shape) return;
      const mouse = this._board.getTransFormedCoords(e);

      this.shape.set("points", [
         ...this.shape.get("points"),
         { x: mouse.x - this.shape.left, y: mouse.y - this.shape.top },
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

   dblClick(e: PointerEvent | MouseEvent) {}

   onClick(e: PointerEvent | MouseEvent): void {}
}

export default DrawTool;
