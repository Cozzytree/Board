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
         if (lastInserted?.type === "selection") {
            if (lastInserted.IsDraggable(mouse)) {
               this.draggedShape = lastInserted;
               return;
            }

            const resize = lastInserted.IsResizable(mouse);
            if (resize) {
               this.resizableShape = {
                  s: lastInserted,
                  d: resize,
                  oldProps: new Box({
                     x1: lastInserted.left,
                     y1: lastInserted.top,
                     x2: lastInserted.left + lastInserted.width,
                     y2: lastInserted.top + lastInserted.height,
                  }),
               };
               if (lastInserted instanceof ActiveSelection) {
                  lastInserted.shapes.forEach((s) => {
                     s.oldProps = new Box({
                        x1: s.s.left,
                        y1: s.s.top,
                        x2: s.s.left + s.s.width,
                        y2: s.s.top + s.s.height,
                     });
                  });
               }
               return;
            }

            // remove the selection if not resizable or draggable
            if (this.board.shapeStore.removeById(lastInserted.ID())) {
               this.board.shapeStore.setLastInserted = null;
            }
            this.board.render();
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
         return;
      }

      if (this.resizableShape) {
         this.resizableShape.s.Resize(
            mouse,
            this.resizableShape.oldProps,
            this.resizableShape.d,
         );
         this.draw(this.resizableShape.s);
         return;
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
         return;
      }

      this.board.shapeStore.forEach((s) => {
         if (s.isWithin(mouse) && this.board.activeShapes.has(s)) {
            s.mouseover({ e: { point: mouse } });
            return true;
         }

         document.body.style.cursor = "default";
         return false;
      });
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
      this.board.canvas2.style.zIndex = "100";
      shapes.forEach((s) => {
         s.draw({
            active: false,
            addStyles: false,
            ctx: this.board.ctx2,
            resize: this.draggedShape || this.resizableShape ? true : false,
         });
      });
      this.board.canvas2.style.zIndex = "5";
   }
}

export default SelectionTool;
