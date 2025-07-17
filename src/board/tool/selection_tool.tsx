import Board from "../board";
import type Shape from "../shapes/shape";
import type { Point, resizeDirection, submodes, Tool } from "../types";
import { ActiveSelection, Box, Pointer } from "../index";

class SelectionTool implements Tool {
   private board: Board;
   private draggedShape: Shape | null = null;
   private resizableShape: {
      s: Shape;
      d: resizeDirection;
      oldProps: Box;
   } | null = null;
   private lastPoint: Point = new Pointer({ x: 0, y: 0 });
   private subMode: submodes;
   private mouseDownPoint: Point = new Pointer({ x: 0, y: 0 });
   private activeShape: ActiveSelection | null = null;
   private hasSelectionStarted: boolean = false;

   constructor(board: Board, sb: submodes) {
      this.board = board;
      this.subMode = sb || "free";
   }

   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this.board.getTransFormedCoords(e);
      this.mouseDownPoint = mouse;
      this.lastPoint = new Pointer(mouse);

      this.board.activeShapes.clear();
      if (this.subMode === "free") {
         const lastInserted = this.board.shapeStore.getLastInsertedShape();
         if (lastInserted && lastInserted.type === "selection") {
            if (lastInserted.IsDraggable(mouse)) {
               this.draggedShape = lastInserted;
               return;
            } else {
               if (this.board.shapeStore.removeById(lastInserted.ID())) {
                  this.board.shapeStore.setLastInserted = null;
               }

               this.board.render();
            }
         }

         const dragOrResize = this.board.shapeStore.forEach((s) => {
            const d = s.IsResizable(mouse);
            if (d) {
               this.resizableShape = {
                  d,
                  s,
                  oldProps: new Box({
                     x1: s.left,
                     x2: s.left + s.width,
                     y1: s.top,
                     y2: s.top + s.height,
                  }),
               };
               return true;
            }
            return s.IsDraggable(mouse);
         });

         if (dragOrResize) {
            if (!this.resizableShape) {
               this.draggedShape = dragOrResize;
               this.board.activeShapes.add(dragOrResize);
            } else {
               this.board.activeShapes.add(this.resizableShape.s);
            }
         }

         if (!this.draggedShape && !this.resizableShape) {
            this.hasSelectionStarted = true;
            this.activeShape = new ActiveSelection({
               ctx: this.board.ctx,
               board: this.board,
               left: mouse.x,
               top: mouse.y,
               width: 0,
               height: 0,
            });
         }
      } else if (this.subMode === "grab") {
         //
      }
   }

   pointermove(e: PointerEvent | MouseEvent): void {
      const mouse = this.board.getTransFormedCoords(e);
      if (this.draggedShape != null) {
         this.draggedShape.dragging(
            new Pointer(this.lastPoint),
            new Pointer(mouse),
         );
         this.lastPoint = mouse;
         this.draw(this.draggedShape);
      }

      if (this.resizableShape) {
         this.resizableShape.s.Resize(
            mouse,
            this.resizableShape.oldProps,
            this.resizableShape.d,
         );
         this.draw(this.resizableShape.s);
      }

      if (
         !this.resizableShape &&
         !this.draggedShape &&
         this.activeShape &&
         this.hasSelectionStarted
      ) {
         this.activeShape.Resize(
            mouse,
            new Box({
               x1: this.mouseDownPoint.x,
               x2: this.mouseDownPoint.x + 2,
               y1: this.mouseDownPoint.y,
               y2: this.mouseDownPoint.y + 2,
            }),
            "br",
         );
         this.draw(this.activeShape);
      }
   }

   pointerup(e: PointerEvent | MouseEvent): void {
      const mouse = this.board.getTransFormedCoords(e);

      this.hasSelectionStarted = false;
      if (this.activeShape) {
         this.activeShape.mouseup({ e: { point: mouse } });
      }

      // const mouse = this.board.getTransFormedCoords(e);
      if (this.draggedShape) {
         this.draggedShape = null;
      }

      if (this.resizableShape) {
         this.resizableShape = null;
      }

      this.board.render();
      this.board.ctx2.clearRect(
         0 - this.board.offset[0],
         0 - this.board.offset[1],
         this.board.canvas2.width,
         this.board.canvas2.height,
      );
   }

   cleanUp(): void {}

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

export default SelectionTool;
