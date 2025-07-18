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
import type { Point, submodes, Tool, ToolCallback } from "../types";

class ShapeTool implements Tool {
   private board: Board;
   private submode: submodes;
   private newShape: Shape | null = null;
   private mouseDownPoint: Point = new Pointer({ x: 0, y: 0 });

   constructor(board: Board, submode?: submodes) {
      this.board = board;
      this.submode = submode || "rect";
   }

   cleanUp(): void {}
   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this.board.getTransFormedCoords(e);
      this.mouseDownPoint = mouse;
      this.board.activeShapes.clear();

      const lastInserted = this.board.shapeStore.getLastInsertedShape();
      if (lastInserted?.type === "selection") {
         if (this.board.shapeStore.removeById(lastInserted.ID())) {
            this.board.shapeStore.setLastInserted = null;
         }
         this.board.render();
      }

      switch (this.submode) {
         case "path:triangle":
            this.newShape = new Triangle({
               board: this.board,
               ctx: this.board.ctx,
               width: 0,
               height: 0,
               left: mouse.x,
               top: mouse.y,
            });
            break;
         case "path:pentagon":
            this.newShape = new Pentagon({
               board: this.board,
               ctx: this.board.ctx,
               width: 0,
               height: 0,
               left: mouse.x,
               top: mouse.y,
            });
            break;
         case "rect":
            this.newShape = new Rect({
               ctx: this.board.ctx,
               left: mouse.x,
               top: mouse.y,
               width: 0,
               height: 0,
               board: this.board,
            });
            break;
         case "circle":
            this.newShape = new Ellipse({
               ctx: this.board.ctx,
               left: mouse.x,
               top: mouse.y,
               width: 0,
               height: 0,
               rx: 0,
               ry: 0,
               board: this.board,
            });
            break;
      }

      if (this.newShape) {
         this.board.shapeStore.insert(this.newShape);
      }
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      const mouse = this.board.getTransFormedCoords(e);
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

   pointerup(e: PointerEvent | MouseEvent, cb?: ToolCallback): void {
      this.board.ctx2.clearRect(
         0 - this.board.offset[0],
         0 - this.board.offset[1],
         this.board.canvas2.width,
         this.board.canvas2.height,
      );
      this.newShape = null;
      cb?.({ mode: "cursor", submode: "free" });
      this.board.render();
   }

   private draw(...shapes: Shape[]) {
      this.board.ctx2.clearRect(
         0 - this.board.offset[0],
         0 - this.board.offset[1],
         this.board.canvas2.width,
         this.board.canvas2.height,
      );
      shapes.forEach((s) => {
         s.draw({ active: false, addStyles: false, ctx: this.board.ctx2 });
      });
   }
}

export default ShapeTool;
