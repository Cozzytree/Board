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
import { ActiveSelection, Box, Line, Path, Pointer, Rect } from "../index";
import { generateShapeByShapeType } from "../utils/utilfunc";
import type { HistoryType } from "../shapes/shape_store";
import { HoveredColor } from "../constants";
import { Text } from "../index.ts"

const textAreaId = "text-update";

type ResizeShapeProps = {
   s: Shape;
   d: resizeDirection;
   oldProps: Box;
   index?: number; // for lines
} | null;

class SelectionTool implements ToolInterface {
   private hoveredShape: Shape | null = null;
   private isDragging: boolean = false;
   private textEdit: Shape | null = null;
   private isTextEditale: boolean = false;
   private dragThreshold = 2;

   // to store the changed shape to before storing into undo redo store
   private mouseDowmShapeState: Record<string, any>[] = [];

   private isGrabbing: boolean = false;
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
      this.isDragging = false;
      this.isGrabbing = false;
      this.activeShape = null;
      this.mouseDowmShapeState = [];
      this.isTextEditale = false;

      //  get the text document
      if (this.textEdit) {
         const content = this.getTextContentFromElement();
         this.textEdit.set("text", content);
         this.textEdit = null;
      }

      if (this.subMode === "free") {
         // altkey for duplicate
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

         const lastInserted = this._board.shapeStore.getLastInsertedShape();
         if (lastInserted?.type === "selection" && lastInserted instanceof ActiveSelection) {
            if (lastInserted.IsDraggable(p)) {
               this.draggedShape = lastInserted;
               this.activeShape = lastInserted;
               this._board.setActiveShape(lastInserted);
               // insert into undo temp state
               lastInserted.shapes.forEach((as) => {
                  this.mouseDowmShapeState.push(as.s.toObject());
               });
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
                     // insert this to undo
                     if (s.s instanceof Path || s.s instanceof Line) {
                        s.s.lastPoints = s.s.points.map((p) => {
                           return { x: p.x, y: p.y }
                        })
                     }

                     this.mouseDowmShapeState.push(s.s.toObject());
                     s.oldProps = new Box({
                        x1: s.s.left,
                        y1: s.s.top,
                        x2: s.s.left + s.s.width,
                        y2: s.s.top + s.s.height,
                     });
                  });
               }
               // fire mouse down for the shape
               lastInserted.mousedown({ e: { point: p } })
               return;
            }

            // remove the selection if not resizable or draggable
            if (this._board.shapeStore.removeById(lastInserted.ID())) {
               this._board.shapeStore.setLastInserted = null;
            }
            this._board.render();
         }

         // if a shape is already active check if resizable
         const currentActive = this._board.getActiveShapes();
         if (currentActive.length) {
            const s = currentActive[0];
            const d = s.IsResizable(p);
            if (d) {
               this.mouseDowmShapeState.push(s.toObject());

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

            if (s.IsDraggable(p)) {
               this.isTextEditale = true;
            }
         }

         const drag = this._board.shapeStore.forEach((s) => {
            return s.IsDraggable(p);
         });

         if (drag) {
            this.draggedShape = drag;
            this._board.setActiveShape(drag);
            this.mouseDowmShapeState.push(drag.toObject());
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

   private shouldDrag(): boolean {
      const distance = Math.sqrt(
         this._board.evt.dx * this._board.evt.dx + this._board.evt.dy * this._board.evt.dy,
      );
      if (distance > this.dragThreshold) {
         this.isDragging = true;
         return true;
      }

      return false;
   }

   pointermove({ p }: ToolEventData): void {
      this.hoveredShape = null;

      if (this.subMode === "grab" && this.isGrabbing) {
         setTimeout(() => {
            this._board.view.x += this._board.evt.dx;
            this._board.view.y += this._board.evt.dy;

            this._board.render();
         }, 0);

         return;
      }
      this._board._lastMousePosition = p;

      this.shouldDrag();

      if (this.draggedShape != null && this.isDragging) {
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
         this.draw(...this.activeShape.shapes.map((s) => s.s), this.activeShape);
         return;
      }

      this._board.shapeStore.forEach((s) => {
         if (s.isWithin(p)) {
            if (this.draggedShape == null && this.resizableShape == null) {
               if (
                  !this._board.activeShapes.has(s) &&
                  this._board.shapeStore.getLastInsertedShape()?.type !== "selection"
               ) {
                  this.hoveredShape = new Rect({
                     _board: this._board,
                     ctx: this._board.ctx,
                     left: s.left - 4,
                     top: s.top - 4,
                     width: s.width + 8,
                     height: s.height + 8,
                     stroke: HoveredColor,
                     strokeWidth: 3,
                  });
               }
            }
            s.mouseover({ e: { point: p } });
            return true;
         } else {
            this.hoveredShape = null;
         }

         document.body.style.cursor = "default";
         return false;
      });

      if (this.hoveredShape) {
         this.draw(this.hoveredShape);
      } else {
         this._board.ctx2.setTransform(1, 0, 0, 1, 0, 0);
         this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
         this._board.ctx2.save();
      }
   }

   pointerup({ p }: ToolEventData): void {
      if (this.isGrabbing) this.isGrabbing = false;

      if (!this.isDragging && this.subMode === "free" && !this.activeShape && this.isTextEditale) {
         this.draggedShape = null;
         this.resizableShape = null;

         const ac = this._board.getActiveShapes();
         if (!ac.length) return;
         if (ac[0].IsDraggable(p)) {
            this.createText({ s: ac[0], p, start: { x: ac[0].left, y: ac[0].top } });
            this.textEdit = ac[0];
            this.activeShape = null;
            this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
            return;
         }
      }

      if (this.mouseDowmShapeState.length) {
         this.pushToUndo({ objects: this.mouseDowmShapeState, undoType: "default" });
      }

      this.hasSelectionStarted = false;
      if (this.activeShape) {
         this.activeShape.mouseup({ e: { point: p } });
         this.activeShape = null;
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

   private pushToUndo(data: HistoryType) {
      this._board.shapeStore.pushUndo(data);
   }

   private pullFromUndo() {
      const callback = this._board.shapeStore.getLastUndo();
      if (!callback) return null;
      return callback;
   }

   private pullFromRedo() {
      const callback = this._board.shapeStore.getLasRedo();
      if (callback === null) return;
      return callback;
   }

   private createText({ s, start }: { start: Point; s: Shape; p: Point }) {
      let div = document.getElementById(textAreaId);
      if (div) {
         div.remove();
      }

      div = document.createElement("div");
      div.setAttribute("id", textAreaId);

      const tarea = document.createElement("div");
      div.classList.add("input-container");
      div.style.position = "absolute";
      div.style.zIndex = "50";
      div.style.left = start.x + this._board.view.x + "px";
      div.style.top = start.y + this._board.view.y + "px";
      div.style.width = s.width + "px";
      div.style.height = s.height + "px";

      tarea.style.background = "#1e1e1eff"
      tarea.style.border = "1px solid #505050"
      tarea.style.outline = "none"
      tarea.contentEditable = "true";
      tarea.style.whiteSpace = "pre-wrap";
      // tarea.style.overflowWrap = "break-word";
      div.append(tarea);

      tarea.innerText = s.text;
      document.body.append(div);

      setTimeout(() => {
         tarea.focus();
         // Create a new range
         const range = document.createRange();
         range.selectNodeContents(tarea);
         range.collapse(false); // collapse to end

         // Apply the range to the selection
         const sel = window.getSelection();
         if (!sel) return
         sel.removeAllRanges();
         sel.addRange(range);
      }, 0);

      tarea.addEventListener("blur", () => {
         s.set("text", getTextWithNewlines(tarea));
         this.textEdit = null;
         s._board.render();
         div.remove();
         tarea.remove();
      });
   }

   dblClick({ p }: ToolEventData): void {
      const active = this._board.getActiveShapes();
      if (active.length) {
         const a = active[0];
         if (a.IsDraggable(p)) {
            this.createText({ p, s: a, start: { x: a.left, y: a.top } });
         }
      }
   }

   onClick(): void { }

   cleanUp(): void {
      document.removeEventListener("keydown", this.handleKeyDown);
   }

   private onkeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
         if (this.textEdit) {
            const textContent = this.getTextContentFromElement();
            console.log(textContent);
            if (!textContent) {
               this.textEdit = null;
               return;
            };
            this.textEdit.set("text", textContent);
            this.textEdit = null;

            // TODO
            // maybe can be optimized more
            this._board.render();
         }
      }

      if (this.resizableShape || this.draggedShape || this.hasSelectionStarted) return;
      if (e.key === "Delete") {
         const shapes = this._board.getActiveShapes();

         const c = this._board.removeShape(...shapes);
         console.info("deleted count", c);
      } else if (e.ctrlKey) {
         const lastInserted = this._board.shapeStore.getLastInsertedShape();
         if (e.key === "v" && this.textEdit) {
            return;
         }
         switch (e.key) {
            case "d":
               e.preventDefault();
               [...this._board.activeShapes].forEach((s) => {
                  this._board.activeShapes.delete(s);
                  const newShapes: Shape[] = [];
                  if (s instanceof ActiveSelection) {
                     const clone = s.clone() as ActiveSelection;
                     clone.shapes.forEach((shape) => {
                        shape.s.left += 10;
                        shape.s.top += 10;
                        newShapes.push(shape.s);
                     });
                     if (lastInserted?.type === "selection") {
                        this._board.removeShape(lastInserted);
                     }

                     this._board.discardActiveShapes();
                     this._board.setActiveShape(clone);
                     newShapes.push(clone);
                  } else {
                     const c = s.clone();
                     c.left += 10;
                     c.top += 10;
                     newShapes.push(c);
                  }
                  const objs = newShapes.map((s) => s.toObject());
                  this.pushToUndo({ undoType: "create", objects: objs });
                  this._board.add(...newShapes);
               });
               this._board.render();
               break;
            case "a":
               e.preventDefault();
               if (lastInserted?.type === "selection") {
                  this._board.removeShape(lastInserted);
                  this._board.ctx2.clearRect(
                     0,
                     0,
                     this._board.canvas2.width,
                     this._board.canvas2.height,
                  );
               }
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
            case "z":
               e.preventDefault();
               this.undo();
               break;
            case "y":
               e.preventDefault();
               this.redo();
               break;
            default:
         }
      }
   }

   private getTextContentFromElement(): string {
      const div = document.getElementById(textAreaId);
      const t = div?.children.item(0) as HTMLDivElement | null;

      if (t !== null) {
         // Remove the wrapper div
         div?.remove();

         const text = getTextWithNewlines(t)
         console.log("text content ", text)
         // Use textContent to better preserve newlines
         return text;
      }

      return "";
   }


   private redo() {
      const history = this.pullFromRedo();
      if (!history) return;

      history((val) => {
         return this.historyAction(val, 1);
      });
   }

   private undo() {
      const history = this.pullFromUndo();
      if (!history) return;

      history((val) => {
         return this.historyAction(val, 0);
      });
   }

   /*
      @redoUndo: 1 == redo | 0 == undo
   */
   private historyAction(data: HistoryType, redoUndo: number) {
      const currState: Record<string, any>[] = [];
      const shapes = data.objects as { [K in keyof Shape]: Shape[K] }[];

      const create = () => {
         shapes.forEach((s) => {
            if (s.type) {
               const newShape = generateShapeByShapeType(s, this._board, this._board.ctx);
               if (newShape) {
                  newShape.id = s.id;
                  this._board.add(newShape);
                  currState.push(newShape.toObject());
               }
            }
         });
      };

      const del = () => {
         data.objects.forEach((o) => {
            if (o.id) {
               if (this._board.shapeStore.removeById(o.id)) {
                  currState.push(o);
               }
               this._board.discardActiveShapes();
               const lastInserted = this._board.shapeStore.getLastInsertedShape();
               if (lastInserted instanceof ActiveSelection) {
                  this._board.removeShape(lastInserted);
               }
            } else {
               console.error("error deleing shapes");
            }
         });
      };

      switch (data.undoType) {
         case "default":
            shapes.forEach((s) => {
               if (s?.id) {
                  const found = this._board.shapeStore.get(s.id);
                  if (found) {
                     currState.push(found.toObject());
                     found.left = s.left;
                     found.top = s.top;
                     found.width = s.width;
                     found.height = s.height;
                     found.stroke = s.stroke;
                     found.strokeWidth = s.strokeWidth;
                     found.fill = s.fill;
                     found.flipX = s.flipX;
                     found.flipY = s.flipY;
                     found.rotate = s.rotate;
                     found.scale = s.scale;
                     found.dash = s.dash;
                     found.text = s.text;
                     found.connections = s.connections;
                  }
               }
            });
            break;
         case "create":
            if (redoUndo === 1) {
               create();
            } else {
               del();
            }
            break;
         case "delete":
            if (redoUndo === 1) {
               del();
            } else {
               create();
            }
      }
      this._board.render();
      return currState;
   }

   private getCopiesFromStoreAndAdd() {
      const copies = this._board.shapeStore.getLastCopy;
      if (!copies || !copies.length) {
         navigator.clipboard.readText()
            .then((text) => {
               if (!text) return;
               this._board.add(new Text({
                  text,
                  left: this._board.canvas.width / 2,
                  top: this._board.canvas.height / 2,
                  _board: this._board,
                  ctx: this._board.ctx,
                  verticalAlign: "center",
                  textAlign: "center"
               }));
               this._board.render();
               // do something with text
            })
            .catch((err) => {
               console.error("Failed to read clipboard: ", err);
            });
         return;
      };

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
            addStyles: false,
            ctx: ctx,
            resize: this.draggedShape || this.resizableShape ? true : false,
         });
      });
      ctx.restore();
   }
}

function getTextWithNewlines(el: HTMLElement): string {
   let result = "";

   el.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
         result += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
         const element = child as HTMLElement;
         const tag = element.tagName;

         if (tag === "BR") {
            result += "\n";
         } else {
            const childText = getTextWithNewlines(element);
            const display = window.getComputedStyle(element).display;

            result += childText;

            // Append newline if it's a block-level or flex container
            if (display === "block" || display === "flex" || tag === "DIV" || tag === "P") {
               result += "\n";
            }
         }
      }
   });

   // Normalize multiple newlines and trim trailing whitespace
   return result.replace(/\n{2,}/g, "\n").trim();
}


export default SelectionTool;
