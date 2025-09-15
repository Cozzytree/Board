import type Shape from "../shapes/shape";
import type { ToolEventData } from "../types";

import Board from "../board";
import Rect from "../shapes/rect";
import Box from "../utils/box";
import Tool from "./tool";
import { IsIn } from "../utils/utilfunc";

class EraserTool extends Tool {
   private startPoint = { x: 0, y: 0 };
   private indicatorShape: Shape | null;
   private oldProps: Box | null;
   private isDrawing: boolean;

   constructor(board: Board) {
      super(board);
      this.isDrawing = false;
      this.indicatorShape = new Rect({
         _board: board,
         ctx: this._board.ctx2,
         fill: "transparent",
      });
      this.oldProps = new Box({
         x1: 0,
         y1: 0,
         x2: 0,
         y2: 0,
      });
   }

   onClick(e: ToolEventData): void {}

   dblClick(): void {}

   cleanUp(): void {
      this.indicatorShape = null;
      this.oldProps = null;
   }

   protected draw(...shapes: Shape[]): void {
      super.draw(...shapes);
   }

   pointerDown(e: ToolEventData): void {
      this.startPoint = e.p;
      this.isDrawing = true;
      if (this.oldProps && this.indicatorShape) {
         this.indicatorShape.set({
            left: e.p.x,
            top: e.p.y,
            width: 0,
            height: 0,
         });
         this.oldProps.x1 = this.indicatorShape.left;
         this.oldProps.y1 = this.indicatorShape.top;
         this.oldProps.x2 = this.indicatorShape.left + this.indicatorShape.width;
         this.oldProps.y2 = this.indicatorShape.top + this.indicatorShape.height;
      }
   }

   pointerup(e: ToolEventData): void {
      this.isDrawing = false;
      const b = new Box({
         x1: Math.min(this.startPoint.x, e.p.x),
         y1: Math.min(this.startPoint.y, e.p.y),
         x2: Math.max(this.startPoint.x, e.p.x),
         y2: Math.max(this.startPoint.y, e.p.y),
      });

      this._board.shapeStore.forEach((s) => {
         const corners = [
            // top-left
            new Box({ x1: s.left, x2: s.left + 1, y1: s.top, y2: s.top + 1 }),
            // top-right
            new Box({ x1: s.left + s.width, x2: s.left + s.width + 1, y1: s.top, y2: s.top + 1 }),
            // bottom-left
            new Box({ x1: s.left, x2: s.left + 1, y1: s.top + s.height, y2: s.top + s.height + 1 }),
            // bottom-right
            new Box({
               x1: s.left + s.width,
               x2: s.left + s.width + 1,
               y1: s.top + s.height,
               y2: s.top + s.height + 1,
            }),
         ];

         const inside = corners.some((c) => IsIn({ inner: c, outer: b }));

         if (inside) {
            this._board.removeShape(s);
         }
         return false;
      });
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
   }

   pointermove(e: ToolEventData): void {
      if (this.isDrawing && this.indicatorShape && this.oldProps) {
         this.indicatorShape.Resize(e.p, this.oldProps, "br");
         this.draw(this.indicatorShape);
      }
   }
}

export default EraserTool;
