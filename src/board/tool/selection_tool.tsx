import Board from "../board";
import type Shape from "../shapes/shape";
import type {
   Identity,
   Point,
   resizeDirection,
   submodes,
   ToolInterface,
} from "../types";
import { ActiveSelection, Box, Pointer } from "../index";
import { generateShapeByShapeType } from "../utils/utilfunc";

type ResizeShapeProps = {
   s: Shape;
   d: resizeDirection;
   oldProps: Box;
   index?: number; // for lines
} | null;

class SelectionTool implements ToolInterface {
   private handleKeyDown: (e: KeyboardEvent) => void;
   private _board: Board;
   private draggedShape: Shape | null = null;
   private resizableShape: ResizeShapeProps = null;
   private lastPoint: Point = new Pointer({ x: 0, y: 0 });
   private subMode: submodes;
   private mouseDownPoint: Point = new Pointer({ x: 0, y: 0 });
   private activeShape: ActiveSelection | null = null;
   private hasSelectionStarted: boolean = false;

   constructor(board: Board, sb: submodes) {
      this._board = board;
      this.subMode = sb || "free";

      this.handleKeyDown = this.onkeydown.bind(this);
      document.addEventListener("keydown", this.handleKeyDown);
   }

   pointerDown(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);
      this.mouseDownPoint = mouse;
      this.lastPoint = new Pointer(mouse);

      if (e.altKey) {
         const shapeFound = this._board.shapeStore.forEach((s) => {
            if (s.IsDraggable(mouse)) return true;
            return false;
         });
         if (shapeFound) {
            const cloned = shapeFound.clone();
            this._board.add(cloned);
            this.draggedShape = cloned;
         }
         return;
      }

      this._board.activeShapes.clear();
      if (this.subMode === "free") {
         const lastInserted = this._board.shapeStore.getLastInsertedShape();
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
            if (this._board.shapeStore.removeById(lastInserted.ID())) {
               this._board.shapeStore.setLastInserted = null;
            }
            this._board.render();
         }

         const dragOrResize = this._board.shapeStore.forEach((s) => {
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
               this._board.activeShapes.add(dragOrResize);
            } else {
               this._board.activeShapes.add(this.resizableShape.s);
            }
         }

         if (!this.draggedShape && !this.resizableShape) {
            this.hasSelectionStarted = true;
            this.activeShape = new ActiveSelection({
               ctx: this._board.ctx,
               _board: this._board,
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
      const mouse = this._board.getTransFormedCoords(e);
      this._board._lastMousePosition = mouse;
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

      this._board.shapeStore.forEach((s) => {
         if (s.isWithin(mouse) && this._board.activeShapes.has(s)) {
            s.mouseover({ e: { point: mouse } });
            return true;
         }

         document.body.style.cursor = "default";
         return false;
      });
   }

   pointerup(e: PointerEvent | MouseEvent): void {
      const mouse = this._board.getTransFormedCoords(e);

      this.hasSelectionStarted = false;
      if (this.activeShape) {
         this.activeShape.mouseup({ e: { point: mouse } });
      }

      // const mouse = this._board.getTransFormedCoords(e);
      if (this.draggedShape) {
         this.draggedShape.mouseup({ e: { point: mouse } });
         this.draggedShape = null;
      }

      if (this.resizableShape) {
         this.resizableShape.s.mouseup({ e: { point: mouse } });
         this.resizableShape = null;
      }

      this._board.render();
      this._board.ctx2.clearRect(
         0,
         0,
         this._board.canvas2.width,
         this._board.canvas2.height,
      );
   }

   cleanUp(): void {
      document.removeEventListener("keydown", this.handleKeyDown);
   }

   private onkeydown(e: KeyboardEvent) {
      if (this.resizableShape || this.draggedShape || this.hasSelectionStarted)
         return;

      if (e.key === "Delete") {
         const shapes = this._board.getActiveShapes();
         const c = this._board.removeShape(...shapes);
         console.log(c);
      } else if (e.ctrlKey) {
         switch (e.key) {
            case "d":
               e.preventDefault();
               [...this._board.activeShapes].forEach((s) => {
                  this._board.activeShapes.delete(s);
                  const ns = s.clone();
                  ns.left += 10;
                  ns.top += 10;
                  this._board.shapeStore.insert(ns);
                  this._board.activeShapes.add(ns);
               });
               this._board.render();
               break;
            case "a":
               e.preventDefault();
               this.selectAll();
               this._board.render();
               break;
            case "c":
               e.preventDefault();
               this.insertCopiesToStore();
               break;
            case "v":
               e.preventDefault();
               this.getCopiesFromStoreAndAdd();
               break;
         }
      }
   }

   private getCopiesFromStoreAndAdd() {
      const copies = this._board.shapeStore.getLastCopy;
      if (!copies.length) return;

      if (copies.length == 1) {
         const cloned = generateShapeByShapeType(
            copies[0],
            this._board,
            this._board.ctx,
         );
         if (!cloned) return;

         if (cloned instanceof ActiveSelection) {
            const s: Shape[] = [];
            cloned.shapes.forEach((sa) => {
               sa.s.left =
                  this._board._lastMousePosition.x +
                  (sa?.offset?.x || 0) -
                  cloned.width * 0.5;
               sa.s.top =
                  this._board._lastMousePosition.y +
                  (sa?.offset?.y || 0) -
                  cloned.height * 0.5;
               s.push(sa.s);
            });
            this._board.add(...s);
         }

         cloned.left = this._board._lastMousePosition.x - cloned.width * 0.5;
         cloned.top = this._board._lastMousePosition.y - cloned.height * 0.5;

         this._board.add(cloned);
      }

      this._board.render();
   }

   private insertCopiesToStore() {
      const copies: Identity<Shape>[] = Array.from({
         length: this._board.activeShapes.size,
      });
      [...this._board.activeShapes].forEach((s, i) => {
         copies[i] = s.toObject();
      });

      this._board.shapeStore.insertCopy = copies;
   }

   private selectAll() {
      const shapes: { oldProps?: Box; s: Shape }[] = [];
      this._board.shapeStore.forEach((s) => {
         shapes.push({
            s,
            oldProps: new Box({
               x1: s.left,
               y1: s.top,
               x2: s.left + s.width,
               y2: s.top + s.height,
            }),
         });
         return false;
      });

      if (shapes.length == 1) {
         this._board.activeShapes.add(shapes[0].s);
      } else {
         const as = new ActiveSelection({
            shapes,
            ctx: this._board.ctx,
            _board: this._board,
         });
         this._board.activeShapes.add(as);
         this._board.shapeStore.insert(as);
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
            resize: this.draggedShape || this.resizableShape ? true : false,
         });
      });
      ctx.restore();
   }
}

export default SelectionTool;
