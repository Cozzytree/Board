import { Board, Box, Ellipse, Path, Pointer, Rect, type Shape } from "../index";
import type { submodes, ToolInterface, ToolCallback, ToolEventData } from "../types";

class ShapeTool implements ToolInterface {
   private _board: Board;
   private submode: submodes;
   private newShape: Shape | null = null;
   private oldShapeProps: Box

   constructor(board: Board, submode?: submodes) {
      this._board = board;
      this.submode = submode || "rect";
      this.oldShapeProps = new Box({ x1: 0, y1: 0, y2: 0, x2: 0 })
   }

   cleanUp(): void { }

   pointerDown({ p }: ToolEventData): void {
      this._board.activeShapes.clear();

      const lastInserted = this._board.shapeStore.getLastInsertedShape();
      if (lastInserted?.type === "selection") {
         if (this._board.shapeStore.removeById(lastInserted.ID())) {
            this._board.shapeStore.setLastInserted = null;
         }
         this._board.render();
      }

      const w = 4;
      switch (this.submode) {
         case "path:diamond":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: w,
               height: w,
               points: [
                  new Pointer({ x: 0, y: w * 0.2 }),
                  new Pointer({ x: w * 0.2, y: 0 }),
                  new Pointer({ x: w - w * 0.2, y: 0 }),
                  new Pointer({ x: w, y: w * 0.2 }),
                  new Pointer({ x: w / 2, y: w }),
                  new Pointer({ x: 0, y: w * 0.2 }),
               ],
               left: p.x,
               top: p.y,
            });
            break;
         case "path:plus":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: w,
               height: w,
               left: p.x,
               top: p.y,
               points: [
                  new Pointer({ x: 0, y: w * 0.4 }),
                  new Pointer({ x: w * 0.4, y: w * 0.4 }),
                  new Pointer({ x: w * 0.4, y: 0 }),
                  new Pointer({ x: w - (w * 0.4), y: 0 }),
                  new Pointer({ x: w - (w * 0.4), y: w * 0.4 }),
                  new Pointer({ x: w, y: w * 0.4 }),
                  new Pointer({ x: w, y: w - (w * 0.4) }),
                  new Pointer({ x: w - (w * 0.4), y: w - (w * 0.4) }),
                  new Pointer({ x: w - (w * 0.4), y: w }),
                  new Pointer({ x: (w * 0.4), y: w }),
                  new Pointer({ x: (w * 0.4), y: w - (w * 0.4) }),
                  new Pointer({ x: 0, y: w - (w * 0.4) }),
               ],
            });
            break
         case "path:triangle":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: w,
               height: w,
               left: p.x,
               top: p.y,
               points: [
                  new Pointer({ x: w * 0.5, y: 0 }),
                  new Pointer({ x: w, y: w }),
                  new Pointer({ x: 0, y: w }),
                  new Pointer({ x: w * 0.5, y: 0 }),
               ],
            });
            break;
         case "path:trapezoid":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: w,
               height: w,
               left: p.x,
               top: p.y,
               points: [
                  new Pointer({ x: w * 0.2, y: 0 }),
                  new Pointer({ x: w - (w * 0.2), y: 0 }),
                  new Pointer({ x: w, y: w }),
                  new Pointer({ x: 0, y: w }),
               ]
            })
            break
         case "path:pentagon":
            this.newShape = new Path({
               _board: this._board,
               ctx: this._board.ctx,
               width: w,
               height: w,
               left: p.x,
               top: p.y,
               points: [
                  new Pointer({ x: w / 2, y: 0 }),
                  new Pointer({ x: w, y: w * 0.4 }),
                  new Pointer({ x: w - (w * 0.2), y: w }),
                  new Pointer({ x: w * 0.2, y: w }),
                  new Pointer({ x: 0, y: w * 0.4 }),
               ]
            })
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
         this.oldShapeProps = new Box({
            x1: this.newShape.left,
            y1: this.newShape.top,
            x2: this.newShape.left + this.newShape.width,
            y2: this.newShape.top + this.newShape.height
         })
      }
   }

   pointermove({ p }: ToolEventData): void {
      if (this.newShape) {
         this.newShape.Resize(
            p, this.oldShapeProps, "br",
         );
         this.draw(this.newShape);
      }
   }

   pointerup({ p }: ToolEventData, cb?: ToolCallback): void {
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);

      if (this.newShape) {
         this.newShape.setCoords();
         /**/
         this._board.shapeStore.pushUndo({
            undoType: "create",
            objects: [this.newShape.toObject()],
         });

         this.newShape = null;
         cb?.({ mode: "cursor", submode: "free" });
         this._board.render();
      }

      this._board.onMouseUpCallback?.({ e: { point: p } });
   }

   dblClick(): void { }

   onClick(): void { }

   private draw(...shapes: Shape[]) {
      const ctx = this._board.ctx2;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
      ctx.save();

      ctx.translate(this._board.view.x, this._board.view.y);
      ctx.scale(this._board.view.scl, this._board.view.scl);

      this._board.canvas2.style.zIndex = "100";
      shapes.forEach((s) => {
         s.draw({
            addStyles: false,
            ctx: ctx,
            resize: true,
         });
      });
      ctx.restore();
   }
}

export default ShapeTool;
