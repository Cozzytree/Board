import {
   Board,
   Box,
   Ellipse,
   Pentagon,
   Pointer,
   Rect,
   Triangle,
   type Shape,
} from "../index";
import type { Point, submodes, ToolInterface, ToolCallback } from "../types";

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
   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);
      this.mouseDownPoint = mouse;
      this._board.activeShapes.clear();

      const lastInserted = this._board.shapeStore.getLastInsertedShape();
      if (lastInserted?.type === "selection") {
         if (this._board.shapeStore.removeById(lastInserted.ID())) {
            this._board.shapeStore.setLastInserted = null;
         }
         this._board.render();
      }

      switch (this.submode) {
         case "path:triangle":
            this.newShape = new Triangle({
               _board: this._board,
               ctx: this._board.ctx,
               width: 0,
               height: 0,
               left: mouse.x,
               top: mouse.y,
            });
            break;
         case "path:pentagon":
            this.newShape = new Pentagon({
               _board: this._board,
               ctx: this._board.ctx,
               width: 0,
               height: 0,
               left: mouse.x,
               top: mouse.y,
            });
            break;
         case "rect":
            this.newShape = new Rect({
               ctx: this._board.ctx,
               left: mouse.x,
               top: mouse.y,
               width: 0,
               height: 0,
               _board: this._board,
            });
            break;
         case "circle":
            this.newShape = new Ellipse({
               ctx: this._board.ctx,
               left: mouse.x,
               top: mouse.y,
               width: 0,
               height: 0,
               rx: 0,
               ry: 0,
               _board: this._board,
            });
            break;
      }

      if (this.newShape) {
         this._board.shapeStore.insert(this.newShape);
      }
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);
      if (this.newShape) {
         this.newShape.Resize(
            mouse,
            new Box({
               x1: this.mouseDownPoint.x,
               y1: this.mouseDownPoint.y,
               x2: this.mouseDownPoint.x + 2,
               y2: this.mouseDownPoint.y + 22,
            }),
            "br",
         );
         this.draw(this.newShape);
      }
   }

   pointerup(_: PointerEvent | MouseEvent, cb?: ToolCallback): void {
      this._board.ctx2.clearRect(
         0,
         0,
         this._board.canvas2.width,
         this._board.canvas2.height,
      );

      if (this.newShape) {
         this._board.setActiveShape(this.newShape);
         this.newShape = null;
         cb?.({ mode: "cursor", submode: "free" });
         this._board.render();
      }
   }

   private draw(...shapes: Shape[]) {
      const ctx = this._board.ctx2;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(
         0,
         0,
         this._board.canvas2.width,
         this._board.canvas2.height,
      );
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
