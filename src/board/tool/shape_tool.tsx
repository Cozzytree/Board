import { Board, Box, Ellipse, Path, Pentagon, Pointer, Rect, type Shape } from "../index";
import type { Point, submodes, ToolInterface, ToolCallback, ToolEventData } from "../types";

class ShapeTool implements ToolInterface {
   private _board: Board;
   private submode: submodes;
   private newShape: Shape | null = null;
   private mouseDownPoint: Point = new Pointer({ x: 0, y: 0 });

   constructor(board: Board, submode?: submodes) {
      this._board = board;
      this.submode = submode || "rect";
   }

   cleanUp(): void {}

   pointerDown({ p }: ToolEventData): void {
      this.mouseDownPoint = p;
      this._board.activeShapes.clear();

      const lastInserted = this._board.shapeStore.getLastInsertedShape();
      if (lastInserted?.type === "selection") {
         if (this._board.shapeStore.removeById(lastInserted.ID())) {
            this._board.shapeStore.setLastInserted = null;
         }
         this._board.render();
      }

      switch (this.submode) {
         case "path:diamond":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: 4,
               height: 4,
               points: [
                  new Pointer({ x: 0, y: 4 * 0.2 }),
                  new Pointer({ x: 4 * 0.2, y: 0 }),
                  new Pointer({ x: 4 - 4 * 0.2, y: 0 }),
                  new Pointer({ x: 4, y: 4 * 0.2 }),
                  new Pointer({ x: 4 / 2, y: 4 }),
                  new Pointer({ x: 0, y: 4 * 0.2 }),
               ],
               left: p.x,
               top: p.y,
            });
            break;
         case "path:triangle":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: 4,
               height: 4,
               left: p.x,
               top: p.y,
               points: [
                  new Pointer({ x: 0 + 4 * 0.5, y: 0 }),
                  new Pointer({ x: 4, y: 4 }),
                  new Pointer({ x: 0, y: 4 }),
                  new Pointer({ x: 4 * 0.5, y: 0 }),
               ],
            });
            break;
         case "path:pentagon":
            this.newShape = new Pentagon({
               _board: this._board,
               ctx: this._board.ctx,
               width: 4,
               height: 4,
               left: p.x,
               top: p.y,
            });
            break;
         case "rect":
            this.newShape = new Rect({
               ctx: this._board.ctx,
               left: p.x,
               top: p.y,
               width: 0,
               height: 0,
               _board: this._board,
            });
            break;
         case "circle":
            this.newShape = new Ellipse({
               ctx: this._board.ctx,
               left: p.x,
               top: p.y,
               width: 0,
               height: 0,
               rx: 0,
               ry: 0,
               _board: this._board,
            });
            break;
      }

      if (this.newShape) {
         this._board.add(this.newShape);
      }
   }

   pointermove({ p }: ToolEventData): void {
      if (this.newShape) {
         this.newShape.Resize(
            p,
            new Box({
               x1: this.mouseDownPoint.x,
               y1: this.mouseDownPoint.y,
               x2: this.newShape.left + this.newShape.width,
               y2: this.newShape.top + this.newShape.height,
            }),
            "br",
         );
         this.draw(this.newShape);
      }
   }

   pointerup({ p }: ToolEventData, cb?: ToolCallback): void {
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);

      if (this.newShape) {
         this.newShape.setCoords();
         this.newShape = null;
         cb?.({ mode: "cursor", submode: "free" });
         this._board.render();
      }

      this._board.onMouseUpCallback?.({ e: { point: p } });
   }

   dblClick(): void {}

   onClick(): void {}

   private draw(...shapes: Shape[]) {
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
            resize: true,
         });
      });
      ctx.restore();
   }
}

export default ShapeTool;
