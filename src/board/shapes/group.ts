import Box from "../utils/box";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation } from "../utils/utilfunc";
import Shape, { type DrawProps } from "./shape";
import { INDICATOR_COLOR } from "../constants";
import type { BoxInterface, Identity, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";

export type GroupDropEvent = {
   shape: Shape;
   point: Point;
   isInside: boolean;
};

type Props = {
   shapes: { s: Shape; oldProps?: BoxInterface }[];
   onDropInto?: (event: GroupDropEvent) => void;
   title?: string;
};

class Group extends Shape {
   declare shapes: { s: Shape; oldProps: BoxInterface | undefined }[];
   title: string;
   onDropInto?: (event: GroupDropEvent) => void;
   private _tempShapes: { s: Shape; oldProps: BoxInterface | undefined }[] = [];
   private _currentShapesIdSet: Set<string> = new Set();

   constructor(props: ShapeProps & Props) {
      super(props);
      this.cachedLocalPath = null;
      this.title = props.title || "frame";
      this.shapes = props.shapes.map((s) => ({ s: s.s, oldProps: s.oldProps }));
      this.onDropInto = props.onDropInto;
      this.type = "group";

      if (props.shapes && props.shapes.length) {
         let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
         props.shapes.forEach(({ s }) => {
            minX = Math.min(minX, s.left);
            minY = Math.min(minY, s.top);
            maxX = Math.max(maxX, s.left + s.width);
            maxY = Math.max(maxY, s.top + s.height);
         });
         this.left = minX - this.padding;
         this.top = minY - this.padding;
         this.width = maxX - minX + this.padding * 2;
         this.height = maxY - minY + this.padding * 2;
      }
   }

   mousedown(s: ShapeEventData): void {
      ;
      this._tempShapes = [];
      this._currentShapesIdSet = new Set(this.shapes.map(s => s.s.ID()));
   }

   toSVG() {
      return "";
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      const newBounds = resizeWithRotation({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 20,
         minHeight: 20,
      });

      this.setSilent({
         left: newBounds.left,
         top: newBounds.top,
         width: newBounds.width,
         height: newBounds.height
      })

      const outer = new Box({
         x1: newBounds.left,
         x2: newBounds.left + newBounds.width,
         y1: newBounds.top,
         y2: newBounds.top + newBounds.height,
      });

      const getRotatedBounds = (s: Shape) => {
         if (!s.rotate) {
            return new Box({
               x1: Math.min(s.left, s.left + s.width),
               x2: Math.max(s.left, s.left + s.width),
               y1: Math.min(s.top, s.top + s.height),
               y2: Math.max(s.top, s.top + s.height)
            });
         }
         const cx = s.left + s.width / 2;
         const cy = s.top + s.height / 2;
         const w2 = Math.abs(s.width) / 2;
         const h2 = Math.abs(s.height) / 2;
         const cos = Math.cos(s.rotate);
         const sin = Math.sin(s.rotate);

         const corners = [
            { x: -w2, y: -h2 }, { x: w2, y: -h2 },
            { x: -w2, y: h2 }, { x: w2, y: h2 }
         ];

         let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
         for (const c of corners) {
            const rx = cx + c.x * cos - c.y * sin;
            const ry = cy + c.x * sin + c.y * cos;
            if (rx < minX) minX = rx;
            if (rx > maxX) maxX = rx;
            if (ry < minY) minY = ry;
            if (ry > maxY) maxY = ry;
         }
         return new Box({ x1: minX, x2: maxX, y1: minY, y2: maxY });
      };

      this._tempShapes = [];

      this._board.shapeStore.forEach((shape) => {
         if (shape.ID() === this.ID() || shape.type === "selection" || shape.type === "group") return false;

         const inner = getRotatedBounds(shape);

         const isAlreadyInGroup = this._currentShapesIdSet.has(shape.ID());

         // If already in group, indicator shows if partially within (intersects)
         // If not in group, indicator shows only if fully within (fullyContains)
         if (isAlreadyInGroup) {
            if (!outer.intersects(inner)) return false;
         } else {
            if (!outer.fullyContains(inner)) return false;
         }

         this._tempShapes.push({
            s: shape,
            oldProps: inner,
         });

         return false;
      });

      // Do not resize child shapes. Only the group frame changes.
      return [];
   }

   mouseup(s: ShapeEventData): void {
      super.mouseup(s);

      let newShapes: { s: Shape; oldProps: BoxInterface }[] = [];

      const outer = new Box({
         x1: this.left,
         y1: this.top,
         x2: this.left + this.width,
         y2: this.top + this.height
      })

      // Scan EVERY shape on the board
      this._board?.shapeStore.forEach((shape) => {
         // Ignore this group itself, selections, and other groups to prevent cyclic recursion
         if (shape.ID() === this.ID() || shape.type === "selection" || shape.type === "group") {
            return false;
         }

         // Ignore shapes that belong to another group
         if (shape.groupId && shape.groupId !== this.ID()) {
            return false;
         }

         const inner = new Box({
            x1: shape.left,
            y1: shape.top,
            x2: shape.left + shape.width,
            y2: shape.top + shape.height
         })

         if (outer.fullyContains(inner)) {
            newShapes.push({
               s: shape,
               oldProps: {
                  x1: shape.left,
                  y1: shape.top,
                  x2: shape.left + shape.width,
                  y2: shape.top + shape.height,
               },
            });
            shape.groupId = this.ID();
         } else if (shape.groupId === this.ID()) {
            // Shape was in this group but popped out
            shape.groupId = undefined;
         }

         return false; // continue loop
      });

      this.shapes = newShapes;
      this._tempShapes = [];
   }

   clone(): Shape {
      const props = super.cloneProps();
      const cloneShapes = this.shapes
         .filter((s) => s.s.ID() !== this.ID())
         .map((s) => ({ s: s.s.clone(), oldProps: s.oldProps }));
      return new Group({
         ...props,
         shapes: cloneShapes,
      });
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const localBox = new Box({
         x1: -width / 2,
         x2: width / 2,
         y1: -height / 2,
         y2: height / 2,
      });
      const d = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );
      if (d) {
         return d.rd;
      }

      return null;
   }

   IsDraggable(p: Point): boolean {
      return isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      });
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.shapes.forEach((s) => {
         // guard just incase if it calls itself
         if (s?.s && this.ID() != s?.s.ID()) {
            s.s.setSilent({
               left: s.s.left + dx,
               top: s.s.top + dy
            });
         }
      });

      this.set({
         left: this.left += dx,
         top: this.top += dy,
      })

      return this.shapes.map((s) => s.s);
   }

   containsPoint(p: Point): boolean {
      const cx = this.left + this.width / 2;
      const cy = this.top + this.height / 2;
      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);
      const dx = p.x - cx;
      const dy = p.y - cy;
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      return (
         localX >= -this.width / 2 &&
         localX <= this.width / 2 &&
         localY >= -this.height / 2 &&
         localY <= this.height / 2
      );
   }

   notifyDrop(shape: Shape, point: Point): void {
      if (!this.onDropInto) return;
      const isInside = this.containsPoint(point);
      this.onDropInto({ shape, point, isInside });
   }

   getShapeAt(p: Point): Shape | null {
      for (const { s } of this.shapes) {
         if (s.IsDraggable(p)) return s;
      }
      return null;
   }

   removeShape(shape: Shape): void {
      shape.groupId = undefined;
      this.shapes = this.shapes.filter(({ s }) => s.ID() !== shape.ID());
   }

   addShape(shape: Shape): void {
      shape.groupId = this.ID();
      const bounds = {
         x1: shape.left,
         y1: shape.top,
         x2: shape.left + shape.width,
         y2: shape.top + shape.height,
      };
      this.shapes.push({ s: shape, oldProps: bounds });
      const newLeft = Math.min(this.left, shape.left - this.padding);
      const newTop = Math.min(this.top, shape.top - this.padding);
      const newRight = Math.max(this.left + this.width, shape.left + shape.width + this.padding);
      const newBottom = Math.max(this.top + this.height, shape.top + shape.height + this.padding);
      this.left = newLeft;
      this.top = newTop;
      this.width = newRight - newLeft;
      this.height = newBottom - newTop;
   }

   ungroup(): Shape[] {
      this.shapes.forEach(({ s }) => {
         s.groupId = undefined;
      });
      return this.shapes.map(({ s }) => s);
   }

   toObject(): Identity<Shape> {
      const obj = super.toObject();
      (obj as any).shapes = this.shapes.map(({ s }) => s.toObject());
      return obj;
   }

   draw({ ctx, resize = false, addStyles = true }: DrawProps): void {
      const context = ctx || this.ctx;
      const currentScale = context.getTransform().a;
      const centerX = this.left + this.width / 2;
      const centerY = this.top + this.height / 2;

      // Draw cached children
      if (resize) {
         context.save();
         context.globalAlpha = this.selectionAlpha;
      }
      
      this.shapes.forEach(({ s }) => {
         s.draw({ ctx: context, resize: false, addStyles });
      });

      if (resize) {
         context.restore();
      }

      if (resize) {
         context.save();
         this._tempShapes.forEach(({ oldProps }) => {
            if (!oldProps) return;
            const x = oldProps.x1 - 4;
            const y = oldProps.y1 - 4;
            const w = (oldProps.x2 - oldProps.x1) + 8;
            const h = (oldProps.y2 - oldProps.y1) + 8;

            context.beginPath();
            context.strokeStyle = INDICATOR_COLOR;
            context.lineWidth = 2 / currentScale; // Match outlineWidthPx in active_selection
            context.setLineDash([4 / currentScale, 4 / currentScale]);
            context.strokeRect(x, y, w, h);
         });
         context.restore();
      }

      // Draw group border
      context.save();
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.lineWidth = this.selectionStrokeWidth;
         // context.setLineDash([
         //   this.selectionDash[0] / currentScale,
         //   this.selectionDash[1] / currentScale,
         // ]);
      } else {
         context.strokeStyle = this.stroke;
         context.lineWidth = 1.5 / currentScale;
         // context.setLineDash([6 / currentScale, 3 / currentScale]);
         // context.globalAlpha = 0.5;
      }

      context.beginPath();
      context.rect(
         this.left - this.padding,
         this.top - this.padding,
         this.width + (this.padding << 1),
         this.height + (this.padding << 1),
      );
      context.stroke();

      if (this.title) {
         context.font = `bold ${14 / currentScale}px ${this.fontFamily || "system-ui"}`;
         context.fillStyle = this.stroke;
         context.textAlign = "left";
         context.textBaseline = "bottom";
         context.fillText(
            this.title,
            this.left - this.padding,
            this.top - this.padding - 4 / currentScale
         );
      }

      context.restore();
   }
}

export default Group;
