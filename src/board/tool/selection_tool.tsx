import Board from "../board";
import { HoveredColor } from "../constants";
import { ActiveSelection, Box, Line, Path, Pointer, Group, Rect } from "../index";
import { Text } from "../index.ts";
import Shape from "../shapes/shape";
import type { HistoryType } from "../shapes/shape_store";
import type {
   EventData,
   Identity,
   Point,
   resizeDirection,
   submodes,
   ToolCallback,
   ToolEventData,
   ToolInterface,
} from "../types";
import { generateShapeByShapeType } from "../utils/utilfunc";
import { snapRotation, snapShape, snapResize } from "../utils/snap";
import { debounce } from "../../lib/utils";

const textAreaId = "text-update";

type ResizeShapeProps = {
   s: Shape;
   d: resizeDirection;
   oldProps: Box;
   index?: number; // for lines
} | null;

class SelectionTool implements ToolInterface {
   private isInput: boolean = false;
   // private snapLines: Shape[];
   private hoveredShape: Shape | null = null;
   private isDragging: boolean = false;
   private isDragLocked: boolean = false;
   private textEdit: Shape | null = null;
   private isTextEditale: boolean = false;
   private dragThreshold = 2;

   /**
   to store the changed shape to before storing into undo redo store
   */
   private mouseDowmShapeState: Record<string, any>[] = [];

   private isGrabbing: boolean = false;
   private isRotating: boolean = false;
   private rotatingShape: Shape | null = null;
   private rotationStartAngle: number = 0;
   private rotationCenter: Point = new Pointer({ x: 0, y: 0 });
   private handleKeyDown: (e: KeyboardEvent) => void;
   private _board: Board;
   private draggedShape: Shape | null = null;
   private resizableShape: ResizeShapeProps = null;
   private lastPoint: Point = new Pointer({ x: 0, y: 0 });
   private subMode: submodes;
   private mouseDownPoint: Point = new Pointer({ x: 0, y: 0 });
   private activeShape: ActiveSelection | null = null;
   private hasSelectionStarted: boolean = false;

   private unsnappedPos: Point = new Pointer({ x: 0, y: 0 });
   private sourceGroup: Group | null = null;

   private isTouchGesture: boolean = false;
   private touchStartDist: number = 0;
   private touchStartMidpoint: { x: number; y: number } = { x: 0, y: 0 };
   private touchStartView: { x: number; y: number; scl: number } | null = null;

   constructor(board: Board, sb: submodes) {
      // this.snapLines = [];
      this._board = board;
      this.subMode = sb || "free";

      this.handleKeyDown = this.onkeydown.bind(this);
      document.addEventListener("keydown", this.handleKeyDown);
   }

   touchStart(e: TouchEvent) {
      if (e.touches.length < 2) return;
      this.isTouchGesture = true;
      const t0 = e.touches[0],
         t1 = e.touches[1];
      this.touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      this.touchStartMidpoint = {
         x: (t0.clientX + t1.clientX) / 2,
         y: (t0.clientY + t1.clientY) / 2,
      };
      const v = this._board.view;
      this.touchStartView = { x: v.x, y: v.y, scl: v.scl };
   }

   touchMove(e: TouchEvent) {
      if (e.touches.length < 2 || !this.touchStartView) return;
      e.preventDefault();
      const t0 = e.touches[0],
         t1 = e.touches[1];
      const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const scaleRatio = newDist / this.touchStartDist;
      const sv = this.touchStartView;
      this._board.view.scl = sv.scl * scaleRatio;
      this._board.view.x =
         midX + scaleRatio * (sv.x - this.touchStartMidpoint.x) + (midX - this.touchStartMidpoint.x);
      this._board.view.y =
         midY + scaleRatio * (sv.y - this.touchStartMidpoint.y) + (midY - this.touchStartMidpoint.y);
      this._board.evt.eps = 1 / this._board.view.scl;
      this._board.renderImmediate();
      this._board.onZoomCallback(this._board.view);
      this._board.onScroll(this._board.view);
   }

   touchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
         this.isTouchGesture = false;
         this.touchStartView = null;
      }
   }

   pointerDown({ e, p }: ToolEventData, callback?: (e: EventData) => void): void {
      if (this.isTouchGesture) return;

      const isTouch = ('touches' in e) || (('pointerType' in e) && (e as any).pointerType === 'touch');
      const touchPadding = isTouch ? 20 : 0;

      // this.snapLines = [];
      // Check if we are currently editing text or if the input exists
      if (this.isInput || document.getElementById(textAreaId)) {
         const el = document.getElementById(textAreaId);
         if (el) {
            const textarea = el.querySelector("textarea") || (el.tagName === "TEXTAREA" ? el : null) as HTMLTextAreaElement | null;
            if (textarea && this.textEdit) {
               const value = textarea.value;
               const originalOpacity = this.textEdit.opacity; // or just assume 1 if it's visible normally
               // Try to restore opacity if it was hidden, though commitAndClose in tryStartTextEdit handles this.
               // We will just force commit here.
               this.textEdit.setSilent({ text: value, opacity: 1 });
               this.textEdit.set("text", value);
            }
            try { el.remove(); } catch (e) {}
         }
         this.isInput = false;
         this.textEdit = null;
         this._board.render();
      }

      this.mouseDownPoint = p;
      this.lastPoint = new Pointer(p);
      this.isDragging = false;
      this.isGrabbing = false;
      this.activeShape = null;
      this.mouseDowmShapeState = [];
      this.isTextEditale = false;

      if (this.subMode === "free") {
         // altkey for duplicate
         if (e.altKey) {
            const activeShape = this._board.getActiveShapes();
            if (activeShape && activeShape.IsDraggable(p)) {
               if (activeShape instanceof ActiveSelection) {
                  const clonedChildren = activeShape.shapes.map((s) => s.s.clone());
                  this._board.add(...clonedChildren);
                  const newSelection = this._board.getActiveShapes();
                  if (newSelection) {
                     this.draggedShape = newSelection;
                     this.unsnappedPos = new Pointer({ x: newSelection.left, y: newSelection.top });
                  }
               } else {
                  const clone = activeShape.clone();
                  this._board.add(clone);
                  this.draggedShape = clone;
                  this.unsnappedPos = new Pointer({ x: clone.left, y: clone.top });
               }
            } else {
               let shapeFound: Shape | null = null;
               this._board.shapeStore.forEach((s) => {
                  if (s.IsDraggable(p)) shapeFound = s;
                  return false;
               });

               if (shapeFound !== null) {
                  const cloned: Shape = shapeFound;
                  this._board.add(cloned.clone());
                  this.draggedShape = cloned;
                  // Initialize unsnapped position
                  this.unsnappedPos = new Pointer({ x: cloned.left, y: cloned.top });
               }
            }
            return;
         }

         const currentActive = this._board.getActiveShapes();
         // const lastInserted = this._board.shapeStore.getLastInsertedShape();
         if (currentActive?.type === "selection" && currentActive instanceof ActiveSelection) {
            if (currentActive.isRotating && currentActive.isRotating(p)) {
               callback?.({ e: { x: p.x, y: p.y, target: [currentActive] } });

               this.isRotating = true;
               this.rotatingShape = currentActive;
               currentActive.shapes.forEach((as) => {
                  this.mouseDowmShapeState.push(as.s.toObject());
               });

               this.rotationCenter = {
                  x: currentActive.left + currentActive.width / 2,
                  y: currentActive.top + currentActive.height / 2,
               };

               // this.initialRotationAngle = Math.atan2(p.y - this.rotationCenter.y, p.x - this.rotationCenter.x);
               // this.initialShapeRotation = currentActive.rotate;
               return;
            }

            const resize = currentActive.IsResizable(p, touchPadding);
            if (resize) {
               callback?.({ e: { x: p.x, y: p.y, target: [currentActive] } });

               this.resizableShape = {
                  s: currentActive,
                  d: resize,
                  oldProps: new Box({
                     x1: currentActive.left,
                     y1: currentActive.top,
                     x2: currentActive.left + currentActive.width,
                     y2: currentActive.top + currentActive.height,
                  }),
               };

               if (currentActive instanceof ActiveSelection) {
                  currentActive.shapes.forEach((s) => {
                     // insert this to undo
                     if (s.s instanceof Path || s.s instanceof Line) {
                        s.s.lastPoints = s.s.points.map((p) => {
                           return { x: p.x, y: p.y };
                        });
                     }

                     this.mouseDowmShapeState.push(s.s.toObject());
                     s.oldProps = new Box({
                        x1: s.s.left,
                        y1: s.s.top,
                        x2: s.s.left + s.s.width,
                        y2: s.s.top + s.s.height,
                     });
                     s.originalFlipX = s.s.flipX;
                     s.originalFlipY = s.s.flipY;
                  });
               }
               // fire mouse down for the shape
               currentActive.mousedown({ e: { point: p } });
               return;
            }

            if (currentActive.IsDraggable(p)) {
               callback?.({ e: { target: [currentActive], x: p.x, y: p.y } });

               this.draggedShape = currentActive;
               this.activeShape = currentActive;
               // Initialize unsnapped position
               this.unsnappedPos = new Pointer({ x: currentActive.left, y: currentActive.top });

               this._board.setActiveShape(currentActive);
               // insert into undo temp state
               currentActive.shapes.forEach((as) => {
                  this.mouseDowmShapeState.push(as.s.toObject());
               });
               return;
            }

            // remove the selection if not resizable or draggable
            if (this._board.shapeStore.removeById(currentActive.ID())) {
               this._board.shapeStore.setLastInserted = null;
            }
            this._board.render();
         }

         // if a shape is already active check if resizable
         if (currentActive) {
            const d = currentActive.IsResizable(p, touchPadding);
            if (d) {
               callback?.({ e: { x: p.x, y: p.y, target: [currentActive] } });

               this.mouseDowmShapeState.push(currentActive.toObject());
               this.resizableShape = {
                  s: currentActive,
                  oldProps: new Box({
                     x1: currentActive.left,
                     y1: currentActive.top,
                     x2: currentActive.left + currentActive.width,
                     y2: currentActive.top + currentActive.height,
                  }),
                  d,
               };

               if (currentActive instanceof Group) {
                  currentActive.shapes.forEach((child) => {
                     if (child.s instanceof Path || child.s instanceof Line) {
                        child.s.lastPoints = child.s.points.map((p) => ({ x: p.x, y: p.y }));
                     }
                     child.oldProps = new Box({
                        x1: child.s.left,
                        y1: child.s.top,
                        x2: child.s.left + child.s.width,
                        y2: child.s.top + child.s.height,
                     });
                     child.originalFlipX = child.s.flipX;
                     child.originalFlipY = child.s.flipY;
                  });
               }
               return;
            }

            if (currentActive.IsDraggable(p)) {
               this.isTextEditale = true;
            }
         }

         // Check for rotation on active shape
         if (currentActive && currentActive.isRotating && currentActive.isRotating(p)) {
            callback?.({ e: { x: p.x, y: p.y, target: [currentActive] } });

            this.isRotating = true;
            this.rotatingShape = currentActive;
            this.mouseDowmShapeState.push(currentActive.toObject());
            // let drag: Shape | null = null;

            // Calculate center and initial angle
            this.rotationCenter = {
               x: currentActive.left + currentActive.width / 2,
               y: currentActive.top + currentActive.height / 2,
            };

            const dx = p.x - this.rotationCenter.x;
            const dy = p.y - this.rotationCenter.y;
            this.rotationStartAngle = Math.atan2(dy, dx) - currentActive.rotate;

            this._board.setCursor("grabbing");
            return;
         }

         // Skip shape selection if already dragging/resizing
         if (this.draggedShape || this.resizableShape) {
            return;
         }

         const drag = this._board.shapeStore.forEach((s) => {
            // Skip shapes owned by a group — they are not directly selectable
            if (s.groupId) return false;
            if (s.IsDraggable(p)) return true;
            return false;
         });

         if (drag !== null) {
            if (drag instanceof Group && this._board.getActiveShapes()?.ID() === drag.ID()) {
               const child = drag.getShapeAt(p);
               if (child) {
                  drag.removeShape(child); // clears child.groupId, keeps child in shapeStore
                  this.draggedShape = child;
                  this.sourceGroup = drag;
                  this.unsnappedPos = new Pointer({ x: child.left, y: child.top });
                  this.lastPoint = new Pointer({ x: p.x, y: p.y });
                  this._board.setActiveShape(child);
                  this._board.render();
                  return;
               }
            }

            callback?.({ e: { x: p.x, y: p.y, target: [drag] } });

            this.isDragLocked = true;
            this.draggedShape = drag;
            // Initialize unsnapped position
            this.unsnappedPos = new Pointer({ x: drag.left, y: drag.top });

            this._board.setActiveShape(drag);
            this.mouseDowmShapeState.push(drag.toObject());
         }

         if (this.resizableShape) {
            this.isDragLocked = true;
         }

         if (!this.draggedShape && !this.resizableShape) {
            callback?.({ e: { x: p.x, y: p.y, target: null } });

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

   private shouldDrag(p: Point): boolean {
      const dx = p.x - this.mouseDownPoint.x;
      const dy = p.y - this.mouseDownPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.dragThreshold) {
         this.isDragging = true;
         return true;
      }

      return false;
   }

   pointermove({ p, e }: ToolEventData, mousemove: (e: EventData) => void): void {
      if (this.isTouchGesture) return;
      this.hoveredShape = null;

      const isTouch = ('touches' in e) || (('pointerType' in e) && (e as any).pointerType === 'touch');
      const touchPadding = isTouch ? 20 : 0;

      if (this.subMode === "grab" && this.isGrabbing) {
         this._board.view.x += this._board.evt.dx;
         this._board.view.y += this._board.evt.dy;

         this._board.onScroll?.(this._board.view);
         this._board.renderImmediate();
         return;
      }
      this._board._lastMousePosition = p;

      this.shouldDrag(p);

      // Handle rotation (omitted for brevity, unchanged)
      if (this.isRotating && this.rotatingShape) {
         const dx = p.x - this.rotationCenter.x;
         const dy = p.y - this.rotationCenter.y;
         const currentAngle = Math.atan2(dy, dx);
         let newRotation = currentAngle - this.rotationStartAngle;

         if (this._board.snap) {
            newRotation = snapRotation(newRotation);
         }

         this.rotatingShape.set({ rotate: newRotation });

         this._board.renderImmediate();
         // this.draw(this.rotatingShape);
         mousemove({ e: { target: [this.rotatingShape], x: p.x, y: p.y } });
         return;
      }

      if (this.draggedShape != null && this.isDragging) {
         // Calculate delta from mouse movement
         const dx = p.x - this.lastPoint.x;
         const dy = p.y - this.lastPoint.y;

         // Update unsnapped position
         this.unsnappedPos.x += dx;
         this.unsnappedPos.y += dy;

         let shapes: Shape[] | void = [];
         let snapLines: Shape[] = [];

         // Check for snap
         if (this._board.snap && this.draggedShape.type !== "selection") {
            const {
               lines,
               x: snappedX,
               y: snappedY,
            } = snapShape({
               board: this._board,
               current: this.unsnappedPos, // Use unsnapped position for check
               shape: this.draggedShape,
               x: this.unsnappedPos.x,
               y: this.unsnappedPos.y,
            });
            snapLines = lines;

            // Calculate effective delta for the shape to match snapped position
            const effectiveDeltaX = snappedX - this.draggedShape.left;
            const effectiveDeltaY = snappedY - this.draggedShape.top;

            // Create a target point that produces this delta against lastPoint
            // delta = target - last => target = last + delta
            const targetPoint = new Pointer({
               x: this.lastPoint.x + effectiveDeltaX,
               y: this.lastPoint.y + effectiveDeltaY,
            });

            shapes = this.draggedShape.dragging(new Pointer(this.lastPoint), targetPoint);
         } else {
            // No snap, just drag normally using mouse position
            // Ensure we sync unsnappedPos in case we toggled snap off/on
            // Actually, dragging() adds delta.
            // If we don't snap, shape.left += dx. unsnappedPos += dx.
            // They should remain in sync relative to each other's start.
            shapes = this.draggedShape.dragging(new Pointer(this.lastPoint), new Pointer(p));
         }


         this.lastPoint = p;

         this.draw(this.draggedShape, ...(shapes || []), ...snapLines);

         mousemove({ e: { target: [this.draggedShape], x: p.x, y: p.y } });
         this._board.fire("shape:move", { e: { target: [this.draggedShape], x: p.x, y: p.y } });
         return;
      }

      if (this.resizableShape) {
         const shapes = this.resizableShape.s.Resize(
            p,
            this.resizableShape.oldProps,
            this.resizableShape.d,
         );

         let snapLines: Shape[] = [];

         if (this._board.snap && this.resizableShape.s.type !== "selection") {
            const oldShapeWidth = this.resizableShape.s.width || 1;
            const oldShapeHeight = this.resizableShape.s.height || 1;

            const { lines, snappedBounds } = snapResize({
               board: this._board,
               shape: this.resizableShape.s,
               direction: this.resizableShape.d,
               newBounds: {
                  left: this.resizableShape.s.left,
                  top: this.resizableShape.s.top,
                  width: this.resizableShape.s.width,
                  height: this.resizableShape.s.height,
               },
               oldProps: this.resizableShape.oldProps,
            });
            snapLines = lines;

            const s = this.resizableShape.s;
            if (s.type === "ellipse") {
               s.rx = snappedBounds.width / 2;
               s.ry = snappedBounds.height / 2;
            } else if (s instanceof Path || s instanceof Line) {
               const scaleX = snappedBounds.width / oldShapeWidth;
               const scaleY = snappedBounds.height / oldShapeHeight;
               s.points.forEach((pt) => {
                  pt.x *= scaleX;
                  pt.y *= scaleY;
               });
            }
            s.setSilent(snappedBounds);
         }

         this.draw(this.resizableShape.s, ...(shapes || []), ...snapLines);

         mousemove({ e: { target: [this.resizableShape.s], x: p.x, y: p.y } });
         this._board.fire("shape:resize", { e: { target: [this.resizableShape.s], x: p.x, y: p.y } });
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
               x2: this.mouseDownPoint.x,
               y1: this.mouseDownPoint.y,
               y2: this.mouseDownPoint.y,
            }),
            "br",
         );

         this.draw(this.activeShape);

         const ctx = this._board.ctx2;
         ctx.save();
         ctx.translate(this._board.view.x, this._board.view.y);
         ctx.scale(this._board.view.scl, this._board.view.scl);
         this.activeShape.shapes.forEach(({ s }) => {
            s.activeRect(ctx);
         });
         ctx.restore();
         return;
      }

      // Check for mouseover on shapes
      let foundHoveredShape = false;

      // First check if we're hovering over the active shape (for rotation/resize cursors)
      const activeShape = this._board.getActiveShapes();
      if (activeShape && !this.isGrabbing && !isTouch) {
         // For active shapes, check rotation zone, resize zone, or draggable area
         if (activeShape.isRotating && activeShape.isRotating(p)) {
            activeShape.mouseover({ e: { point: p } });
            foundHoveredShape = true;
         } else if (activeShape.IsResizable(p, touchPadding)) {
            activeShape.mouseover({ e: { point: p } });
            foundHoveredShape = true;
         } else if (activeShape.IsDraggable(p)) {
            activeShape.mouseover({ e: { point: p } });
            foundHoveredShape = true;
         }
      }

      // If not hovering over active shape, check other shapes
      if (!foundHoveredShape) {
         const topHoveredShape = this._board.shapeStore.forEach((s) => {
            if (s.IsDraggable(p) && !this.isGrabbing) {
               return true;
            }
            return false;
         });

         if (topHoveredShape) {
            const s = topHoveredShape;
            if (this._board.hoverEffect && this.draggedShape === null && this.resizableShape === null) {
               if (
                  this._board.activeShapes?.ID() !== s.ID() &&
                  this._board.shapeStore.getLastInsertedShape()?.type !== "selection"
               ) {
                  /*
                        TODO : need to fix cloning
                        */
                  if (s instanceof Group && s.shapes.length) {
                     // Compute actual bounds from children
                     let minX = Infinity,
                        minY = Infinity,
                        maxX = -Infinity,
                        maxY = -Infinity;
                     s.shapes.forEach(({ s: child }) => {
                        minX = Math.min(minX, child.left);
                        minY = Math.min(minY, child.top);
                        maxX = Math.max(maxX, child.left + child.width);
                        maxY = Math.max(maxY, child.top + child.height);
                     });
                     const pad = s.padding;
                     this.hoveredShape = new Rect({
                        ctx: this._board.ctx,
                        _board: this._board,
                        left: minX - pad,
                        top: minY - pad,
                        width: maxX - minX + pad * 2,
                        height: maxY - minY + pad * 2,
                        fill: "transparent",
                        stroke: HoveredColor,
                        strokeWidth: 2,
                        dash: [0, 0],
                     });
                  } else {
                     this.hoveredShape = s.clone();
                     this.hoveredShape.set({
                        fill: "transparent",
                        dash: [0, 0],
                        stroke: HoveredColor,
                        strokeWidth: 2,
                     });
                  }
               }
            }
            s.mouseover({ e: { point: p } });
            foundHoveredShape = true;
         }
      }

      // Only reset cursor if we're not hovering over any shape
      if (!foundHoveredShape) {
         this.hoveredShape = null;
         this._board.setCursor("default");
      }

      if (this.hoveredShape) {
         this.draw(this.hoveredShape);
      } else {
         this._board.resetContextTransform(this._board.ctx2);
         this._board.ctx2.clearRect(0, 0, this._board.cssWidth, this._board.cssHeight);
         this._board.ctx2.save();
      }

      mousemove({ e: { target: [], x: p.x, y: p.y } });
   }

   pointerup({ p }: ToolEventData, _: ToolCallback, eventCb: (e: EventData) => void): void {
      this.resetGrabState();

      // Handle rotation end
      if (this.isRotating && this.rotatingShape) {
         eventCb({ e: { x: p.x, y: p.y, target: [this.rotatingShape] } });
         this.rotatingShape.mouseup({ e: { point: p } });
         this.isRotating = false;
         this.rotatingShape = null;
         this._board.setCursor("default");
         this._board.render();
         this.clearOverlay();
         return;
      }

      if (this.tryStartTextEdit(p)) {
         eventCb({ e: { x: p.x, y: p.y, target: null } });
         this.activeShape = null;
         return;
      }

      // reset selection state
      this.hasSelectionStarted = false;

      if (this.activeShape) {
         if (!this.draggedShape && !this.resizableShape && this.isDragging) {
            // Ensure the selection box catches up to the final pointer position before resolving
            this.activeShape.Resize(
               p,
               new Box({
                  x1: this.mouseDownPoint.x,
                  x2: this.mouseDownPoint.x,
                  y1: this.mouseDownPoint.y,
                  y2: this.mouseDownPoint.y,
               }),
               "br",
            );

            this.activeShape.mouseup({ e: { point: p } });
            if (this.activeShape.shapes.length === 1) {
               this._board.setActiveShape(this.activeShape.shapes[0].s);
            } else if (this.activeShape.shapes.length > 1) {
               this._board.setActiveShape(this.activeShape);
            } else {
               this._board.discardActiveShapes();
            }
         }
         this.activeShape = null;
      }
      if (this.draggedShape) {
         eventCb({ e: { x: p.x, y: p.y, target: [this.draggedShape] } });
         this.draggedShape.mouseup({ e: { point: p } });
         this.draggedShape.commitUpdate();

         const dropped = this.draggedShape;
         const dropCenter: Point = {
            x: dropped.left + dropped.width / 2,
            y: dropped.top + dropped.height / 2,
         };

         if (this.sourceGroup) {
            // Child was extracted from a group — put it back if still inside, else leave standalone
            if (this.sourceGroup.containsPoint(dropCenter)) {
               this.sourceGroup.addShape(dropped); // sets dropped.groupId
               this._board.setActiveShape(this.sourceGroup);
            }
            this.sourceGroup = null;
         } else {
            // Regular drop: check if dropped into any group
            this._board.shapeStore.forEach((s) => {
               if (s instanceof Group && s.ID() !== dropped.ID() && s.containsPoint(dropCenter)) {
                  s.addShape(dropped); // sets dropped.groupId, shape stays in shapeStore
               }
               return false;
            });
         }

         this.draggedShape = null;
      } else if (this.resizableShape) {
         eventCb({ e: { x: p.x, y: p.y, target: [this.resizableShape.s] } });
         this.resizableShape.s.mouseup({ e: { point: p } });
         this.resizableShape.s.commitUpdate();
         this.resizableShape = null;
      } else eventCb({ e: { x: p.x, y: p.y, target: null } });

      // Unlock drag on pointerup
      this.isDragLocked = false;

      this._board.render();
      this.clearOverlay();
   }

   private tryStartTextEdit(_: Point): boolean {
      if (this.isDragging || !this.isTextEditale || this.hasSelectionStarted) {
         return false;
      }

      this.draggedShape = null;
      this.resizableShape = null;

      const active = this._board.getActiveShapes();
      if (!active) return false;

      // Set state
      this.isInput = true;
      this.textEdit = active;

      // Create textarea element
      const rect = this._board.canvas.getBoundingClientRect();

      // Remove any existing textarea
      const existingEl = document.getElementById(textAreaId);
      try { existingEl?.remove(); } catch (e) {}

      // Create container div
      const div = document.createElement("div");
      div.setAttribute("id", textAreaId);
      div.style.position = "absolute";
      div.style.left = rect.left + this.textEdit.left * this._board.view.scl + this._board.view.x + "px";
      div.style.top = rect.top + this.textEdit.top * this._board.view.scl + this._board.view.y + "px";
      div.style.width = this.textEdit.width * this._board.view.scl + "px";
      div.style.height = this.textEdit.height * this._board.view.scl + "px";
      div.style.zIndex = "1000";
      
      div.style.display = "flex";
      // Text alignment logic for container
      div.style.alignItems = this.textEdit.verticalAlign === "top" ? "flex-start" : this.textEdit.verticalAlign === "bottom" ? "flex-end" : "center";
      div.style.justifyContent = this.textEdit.textAlign === "left" ? "flex-start" : this.textEdit.textAlign === "right" ? "flex-end" : "center";

      const scale = this._board.view.scl;
      const editorFontSize = this.textEdit.fontSize * scale;

      // Create textarea
      const textarea = document.createElement("textarea");
      textarea.setAttribute("data-board-text-edit", "true");
      
      const originalText = this.textEdit.text || "";
      textarea.value = originalText;
      
      textarea.spellcheck = true;
      textarea.autocomplete = "off";
      textarea.setAttribute("autocapitalize", "sentences");
      textarea.setAttribute("inputmode", "text");
      
      textarea.style.margin = "0px";
      textarea.style.padding = `${(this.textEdit.padding || 8) * scale}px`;
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.overflow = "hidden";
      textarea.style.background = "transparent";
      textarea.style.color = this.textEdit.stroke;
      textarea.style.fontFamily = (this.textEdit as any).fontFamily || "system-ui, sans-serif";
      textarea.style.fontWeight = this.textEdit.fontWeight + "";
      textarea.style.fontSize = `${editorFontSize}px`;
      textarea.style.lineHeight = `${editorFontSize * 1.2}px`;
      
      // Crucial part for wrapping text in shape bounds
      textarea.style.whiteSpace = "pre-wrap"; 
      textarea.style.wordBreak = "break-word";
      textarea.style.boxSizing = "border-box";
      textarea.style.caretColor = this.textEdit.stroke;
      textarea.style.textAlign = this.textEdit.textAlign || "center";
      
      // Textarea will fit its content, but never exceed parent div's width
      textarea.style.width = "fit-content";
      textarea.style.maxWidth = "100%";

      if (this.textEdit.italic) {
         textarea.style.fontStyle = "italic";
      }

      div.append(textarea);
      document.body.append(div);

      // Hide the text from the shape but keep the shape itself visible
      this.textEdit.setSilent({ text: "" });
      this._board.render(); // Redraws main canvas immediately (shape is drawn without text)

      const checkResize = debounce(() => {
         if (!this.textEdit) return;
         
         // In a pre-wrap textarea, width wraps naturally, but we need to track height
         const requiredHeight = textarea.scrollHeight;
         const currentHeightScaled = this.textEdit.height * scale;

         // If the textarea height exceeds the shape height, we resize the shape
         if (requiredHeight > currentHeightScaled) {
            const newHeightUnscaled = requiredHeight / scale;
            this.textEdit.setSilent({ height: newHeightUnscaled });
            div.style.height = `${requiredHeight}px`; // Update the container div too
            this._board.render(); // Redraw main canvas
         }
      }, 50);

      const autoSizeTextareaHeight = () => {
         // Reset height to let scrollHeight shrink if lines are deleted
         textarea.style.height = "0px";
         const scrollHeight = textarea.scrollHeight;
         textarea.style.height = scrollHeight + "px";
         checkResize();
      };

      // Initial size
      autoSizeTextareaHeight();

      // Focus the textarea
      requestAnimationFrame(() => {
         textarea.focus();
         textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });

      textarea.addEventListener("input", autoSizeTextareaHeight);

      const commitAndClose = () => {
         const value = textarea.value;
         if (this.textEdit) {
            this.textEdit.setSilent({ text: value }); // Set silently first
            this.textEdit.set("text", value); // Commit text officially to history
            this.textEdit = null;
         }
         this.isInput = false;
         try { div.remove(); } catch (e) { }
         this._board.render(); // Re-render main canvas with text
      };

      // Handle Escape/Enter keys
      const handleKeyDown = (e: KeyboardEvent) => {
         e.stopPropagation();
         if (e.key === "Escape") {
            e.preventDefault();
            commitAndClose();
         } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            commitAndClose();
         }
      };
      textarea.addEventListener("keydown", handleKeyDown);
      textarea.addEventListener("blur", () => {
         commitAndClose();
      })

      // Handle blur
      const handleBlur = () => {
         commitAndClose();
      };
      textarea.addEventListener("blur", handleBlur);

      this._board.discardActiveShapes();

      return true;
   }

   private clearOverlay() {
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
   }

   private resetGrabState() {
      this.isGrabbing = false;
   }

   private createText() {
      if (!this.textEdit) return;
      const { ctx2: context, canvas2: canvas } = this._board;
      this._board.resetContextTransform(context);
      context.clearRect(0, 0, this._board.cssWidth, this._board.cssHeight);

      this.textEdit.adjustHeight(this.textEdit.height);
      this.textEdit.draw({ ctx: context, addStyles: true });

      context.restore();
   }

   dblClick({ p }: ToolEventData): void {
      const active = this._board.getActiveShapes();
      if (active) {
         const a = active;
         if (a.IsDraggable(p)) {
            this.createText();
         }
      } else {
         this._board.setMode = { m: "text", sm: null, originUi: true }
         this._board.currentTool?.onClick({ p });
      }
   }

   onClick(): void { }

   cleanUp(): void {
      // Clean up textarea if active
      const el = document.getElementById(textAreaId);
      try { el?.remove(); } catch (e) { }
      this.isInput = false;
      this.textEdit = null;
      document.removeEventListener("keydown", this.handleKeyDown);
   }

   private onkeydown(e: KeyboardEvent) {
      // Text editing is now handled by textarea in tryStartTextEdit()
      // This method only handles other keyboard shortcuts

      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (this.isInput || isTyping) return;

      if (this.resizableShape || this.draggedShape || this.hasSelectionStarted) return;
      if (e.key === "Delete") {
         const shapes = this._board.getActiveShapes();

         if (shapes) {
            const c = this._board.removeShape(shapes);
            console.info("deleted count", c);
         }
      } else if (e.ctrlKey) {
         switch (e.key) {
            case "d": {
               e.preventDefault();
               const activeShape = this._board.getActiveShapes();
               if (!activeShape) return;

               if (activeShape instanceof ActiveSelection) {
                  const clonedChildren = activeShape.shapes.map((s) => {
                     const clonedChild = s.s.clone();
                     clonedChild.set({ left: clonedChild.left + 10, top: clonedChild.top + 10 });
                     return clonedChild;
                  });
                  this._board.add(...clonedChildren);
               } else {
                  const clone = activeShape.clone();
                  clone.set({ left: clone.left + 10, top: clone.top + 10 });
                  this._board.add(clone);
               }
               this._board.render();
               break;
            }
            case "a":
               {
                  e.preventDefault();
                  this.selectAll();
                  this._board.render();
               }
               break;
            case "c":
               e.preventDefault();
               this.insertCopiesToStore();
               break;
            case "v":
               e.preventDefault();
               this.getCopiesFromStoreAndAdd();
               break;
            default:
         }
      }
   }

   private getCopiesFromStoreAndAdd() {
      const copies = this._board.shapeStore.getLastCopy;
      if (!copies || !copies.length) {
         navigator.clipboard
            .readText()
            .then((text) => {
               if (!text) return;
               this._board.add(
                  new Text({
                     text,
                     left: this._board.canvas.width / 2,
                     top: this._board.canvas.height / 2,
                     _board: this._board,
                     ctx: this._board.ctx,
                     verticalAlign: "center",
                     textAlign: "center",
                  }),
               );
               this._board.render();
               // do something with text
            })
            .catch((err) => {
               console.error("Failed to read clipboard: ", err);
            });
         return;
      }

      if (copies.length == 1) {
         const cloned = generateShapeByShapeType(copies[0], this._board, this._board.ctx);
         if (!cloned) return;

         if (cloned instanceof ActiveSelection) {
            const s: Shape[] = [];
            cloned.shapes.forEach((sa) => {
               sa.s.left = this._board._lastMousePosition.x + (sa?.offset?.x || 0) - cloned.width * 0.5;
               sa.s.top = this._board._lastMousePosition.y + (sa?.offset?.y || 0) - cloned.height * 0.5;
               s.push(sa.s);
            });

            this._board.add(...s);
         } else {
            cloned.left = this._board._lastMousePosition.x - cloned.width * 0.5;
            cloned.top = this._board._lastMousePosition.y - cloned.height * 0.5;

            this._board.add(cloned);
         }
      }

      this._board.render();
   }

   private insertCopiesToStore() {
      const copies: Identity<Shape>[] = [];
      const s = this._board.activeShapes;
      if (s) {
         copies.push(s.toObject());
      }

      this._board.shapeStore.insertCopy = copies;
   }

   private selectAll() {
      // this._board.removeActiveSelectionOnly();
      this._board.discardActiveShapes();

      const shapes: { oldProps?: Box; s: Shape }[] = [];
      this._board.shapeStore.forEach((s) => {
         // dont insert selection
         if (s.type != "selection") {
            shapes.push({
               s,
               oldProps: new Box({
                  x1: s.left,
                  y1: s.top,
                  x2: s.left + s.width,
                  y2: s.top + s.height,
               }),
            });
         }
         return false;
      });

      if (shapes.length == 1) {
         this._board.add(shapes[0].s);
      } else {
         const as = new ActiveSelection({
            shapes,
            ctx: this._board.ctx,
            _board: this._board,
         });
         this._board.setActiveShape(as);
      }
   }

   private draw(...shapes: Shape[]) {
      const ctx = this._board.ctx2;

      this._board.resetContextTransform(ctx);
      ctx.clearRect(0, 0, this._board.cssWidth, this._board.cssHeight);
      ctx.save();

      // ctx.translate(this._board.offset.x, this._board.offset.y);
      ctx.translate(this._board.view.x, this._board.view.y);
      // ctx.scale(this._board.scale, this._board.scale);
      ctx.scale(this._board.view.scl, this._board.view.scl);

      const currentScale = this._board.view.scl;
      this._board.canvas2.style.zIndex = "100";
      shapes.forEach((s) => {
         const isResizing = this.draggedShape || this.resizableShape;
         s.draw({
            addStyles: false,
            ctx: ctx,
            resize: isResizing !== null,
         });
      });
      ctx.restore();
   }
}

export default SelectionTool;
