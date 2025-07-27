import Board from "../board";
import type Shape from "../shapes/shape";
import type {
   Identity,
   Point,
   resizeDirection,
   submodes,
   ToolEventData,
   ToolInterface,
} from "../types";
import { ActiveSelection, Box, Pointer } from "../index";
import { generateShapeByShapeType } from "../utils/utilfunc";

const textAreaId = "text-update";

type ResizeShapeProps = {
   s: Shape;
   d: resizeDirection;
   oldProps: Box;
   index?: number; // for lines
} | null;

class SelectionTool implements ToolInterface {
   private isGrabbing: boolean = false;
   private isTextEdit: Shape | null = null;
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

   pointerDown({ e, p }: ToolEventData): void {
      this.mouseDownPoint = p;
      this.lastPoint = new Pointer(p);

      if (this.isTextEdit != null) return;

      if (e.altKey) {
         const shapeFound = this._board.shapeStore.forEach((s) => {
            if (s.IsDraggable(p)) return true;
            return false;
         });
         if (shapeFound) {
            const cloned = shapeFound.clone();
            this._board.add(cloned);
            this.draggedShape = cloned;
         }
         return;
      }

      if (this.subMode === "free") {
         const lastInserted = this._board.shapeStore.getLastInsertedShape();
         if (lastInserted?.type === "selection") {
            if (lastInserted.IsDraggable(p)) {
               this.draggedShape = lastInserted;
               return;
            }

            const resize = lastInserted.IsResizable(p);
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

         const currentActive = this._board.getActiveShapes();
         if (currentActive.length) {
            const s = currentActive[0];
            const d = s.IsResizable(p);
            if (d) {
               this.resizableShape = {
                  s,
                  oldProps: new Box({
                     x1: s.left,
                     y1: s.top,
                     x2: s.left + s.width,
                     y2: s.top + s.height,
                  }),
                  d,
               };
               return;
            }
         }

         const drag = this._board.shapeStore.forEach((s) => {
            return s.IsDraggable(p);
         });

         if (drag) {
            this.draggedShape = drag;
            this._board.setActiveShape(drag);
         }

         if (!this.draggedShape && !this.resizableShape) {
            this._board.discardActiveShapes();
            this.hasSelectionStarted = true;
            this.activeShape = new ActiveSelection({
               ctx: this._board.ctx,
               _board: this._board,
               left: p.x,
               top: p.y,
               width: 0,
               height: 0,
            });
         }
      } else if (this.subMode === "grab") {
         this._board.discardActiveShapes();
         this.isGrabbing = true;
      }
   }

   pointermove({ p }: ToolEventData): void {
      if (this.subMode === "grab" && this.isGrabbing) {
         this._board.view.x += this._board.evt.dx;
         this._board.view.y += this._board.evt.dy;

         this._board.render();

         return;
      }
      this._board._lastMousePosition = p;

      if (this.draggedShape != null) {
         const shapes = this.draggedShape.dragging(new Pointer(this.lastPoint), new Pointer(p));
         this.lastPoint = p;
         this.draw(this.draggedShape, ...(shapes || []));
         return;
      }

      if (this.resizableShape) {
         const shapes = this.resizableShape.s.Resize(
            p,
            this.resizableShape.oldProps,
            this.resizableShape.d,
         );
         this.draw(this.resizableShape.s, ...(shapes || []));
         return;
      }

      if (
         !this.resizableShape &&
         !this.draggedShape &&
         this.activeShape &&
         this.hasSelectionStarted
      ) {
         this.activeShape.Resize(
            p,
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
         if (s.isWithin(p) && this._board.activeShapes.has(s)) {
            s.mouseover({ e: { point: p } });
            return true;
         }

         document.body.style.cursor = "default";
         return false;
      });
   }

   pointerup({ p }: ToolEventData): void {
      if (this.isGrabbing) {
         this.isGrabbing = false;
      }

      this.hasSelectionStarted = false;
      if (this.activeShape) {
         this.activeShape.mouseup({ e: { point: p } });
      }

      // const mouse = this._board.getTransFormedCoords(e);
      if (this.draggedShape) {
         this.draggedShape.mouseup({ e: { point: p } });
         this.draggedShape = null;
      }

      if (this.resizableShape) {
         this.resizableShape.s.mouseup({ e: { point: p } });
         this.resizableShape = null;
      }

      this._board.render();
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
      this._board.onMouseUpCallback?.({ e: { point: p } });
   }

   dblClick({ p }: ToolEventData): void {
      const active = this._board.getActiveShapes();
      if (active.length) {
         const a = active[0];
         if (a.IsDraggable(p)) {
            const rect = this._board.canvas.getBoundingClientRect();
            document.getElementById(textAreaId)?.remove();

            const div = document.createElement("div");
            div.setAttribute("id", textAreaId);

            const tarea = document.createElement("textarea");
            div.classList.add("input-container");
            div.style.position = "absolute";
            div.style.zIndex = "50";
            div.style.left = rect.left + p.x + this._board.view.x + "px";
            div.style.top = rect.top + p.y + this._board.view.y + "px";
            div.append(tarea);

            tarea.placeholder = "type here";
            tarea.innerText = a.text;
            document.body.append(div);

            tarea.focus();

            tarea.addEventListener("blur", () => {
               console.log(tarea);
               a.set("text", tarea.value);
               this.isTextEdit = null;
               a._board.render();
               div.remove();
               tarea.remove();
            });

            this.isTextEdit = a;
         }
      }
   }

   onClick(): void {}

   cleanUp(): void {
      document.removeEventListener("keydown", this.handleKeyDown);
   }

   private onkeydown(e: KeyboardEvent) {
      if (this.resizableShape || this.draggedShape || this.hasSelectionStarted) return;

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
                  this._board.add(ns);
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
         const cloned = generateShapeByShapeType(copies[0], this._board, this._board.ctx);
         if (!cloned) return;

         if (cloned instanceof ActiveSelection) {
            const s: Shape[] = [];
            cloned.shapes.forEach((sa) => {
               sa.s.left =
                  this._board._lastMousePosition.x + (sa?.offset?.x || 0) - cloned.width * 0.5;
               sa.s.top =
                  this._board._lastMousePosition.y + (sa?.offset?.y || 0) - cloned.height * 0.5;
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
      ctx.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
      ctx.save();

      // ctx.translate(this._board.offset.x, this._board.offset.y);
      ctx.translate(this._board.view.x, this._board.view.y);
      // ctx.scale(this._board.scale, this._board.scale);
      ctx.scale(this._board.view.scl, this._board.view.scl);

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
