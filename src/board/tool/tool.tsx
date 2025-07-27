import type { Board, Shape } from "@/board/index";
import type { ToolCallback, ToolEventData, ToolInterface } from "../types";

abstract class Tool implements ToolInterface {
   protected _board: Board;

   abstract pointerDown(e: ToolEventData): void;
   abstract pointermove(e: ToolEventData): void;
   abstract pointerup(e: ToolEventData, cb?: ToolCallback): void;
   abstract onClick(e: ToolEventData): void;
   abstract dblClick(e: ToolEventData): void;
   abstract cleanUp(): void;

   constructor(board: Board) {
      this._board = board;
   }

   protected draw(...shapes: Shape[]) {
      const ctx = this._board.ctx2;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
      ctx.save();

      ctx.translate(this._board.offset.x, this._board.offset.y);
      ctx.scale(this._board.scale, this._board.scale);

      this._board.canvas2.style.zIndex = "100";
      shapes.forEach((s) => {
         s.draw({
            active: false,
            addStyles: false,
            ctx: ctx,
         });
      });
      ctx.restore();
   }
}

export default Tool;
