import { Box, Pointer, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect, isDraggableWithRotation } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { breakText, calcPointWithRotation } from "../utils/utilfunc";
import type { DrawProps } from "./shape";

type RectProps = {
   rx?: number;
   ry?: number;
};

class Rect extends Shape {
   declare rx: number;
   declare ry: number;

   constructor(props: ShapeProps & RectProps) {
      super({ ...props });
      this.rx = props.rx || 0;
      this.ry = props.ry || 0;

      this.type = "rect";
      this.verticalAlign = "center";
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Rect({ ...props, rx: this.rx, ry: this.ry });
   }

   getLocalPath(): Path2D {
      if (!this.cachedLocalPath) {
         this.cachedLocalPath = new Path2D();
         const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);
         this.cachedLocalPath.roundRect(0, 0, this.width, this.height, r);
      }
      return this.cachedLocalPath;
   }

   mousedown(s: ShapeEventData): void {
      super.mousedown(s);
   }

   mouseover(s: ShapeEventData): void {
      super.mouseover(s);
   }

   mouseup(s: ShapeEventData): void {
      super.set({
         width: Math.max(this.width, 20),
         height: Math.max(this.height, 20),
         locked: false,
      });
      super.mouseup(s);
   }

   IsDraggable(p: Pointer): boolean {
      // Use the rotation-aware draggable check utility
      const d = isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      });
      if (d) {
         this.set({
            locked: true,
         });
      }
      return d;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      // const dx = current.x - this._startMouse.x;
      // const dy = current.y - this._startMouse.y;

      // const cos = Math.cos(-this.rotate);
      // const sin = Math.sin(-this.rotate);
      // const localDx = dx * cos - dy * sin;
      // const localDy = dx * sin + dy * cos;

      // const rotatedDx = dx * cos - dy * sin;
      // const rotatedDy = dx * sin + dy * cos;

      // this.left = this._startPos.x + localDx;
      // this.top = this._startPos.y + localDy;
      this.dragTarget(dx, dy);

      return super.dragging(prev, current);
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
      // const d = resizeRect(
      //    calcPointWithRotation({ height, width, left, point: p, rotate, top }),
      //    new Box({
      //       x1: this.left,
      //       x2: this.left + this.width,
      //       y1: this.top,
      //       y2: this.top + this.height,
      //    }),
      //    this.padding,
      // );
      if (d) {
         return d.rd;
      }
      return null;
   }

   draw({ addStyles = true, ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);

      context.save();

      // Get the current scale BEFORE applying rotation
      const currentScale = context.getTransform().a;

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();
      context.globalAlpha = this.opacity;

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.fillStyle = this.selectionFill;
         // context.lineWidth = this.selectionStrokeWidth / currentScale;
         context.lineWidth = this.selectionStrokeWidth;
         context.setLineDash([
            this.selectionDash[0] / currentScale,
            this.selectionDash[1] / currentScale,
         ]);
      } else {
         context.setLineDash(this.dash);
         context.lineWidth = this.strokeWidth;
         context.strokeStyle = this.stroke;
         context.fillStyle = this.fill;
      }

      context.roundRect(this.left, this.top, this.width, this.height, r);
      context.stroke();

      if (addStyles) {
         context.fill();
      }

      context.closePath();
      if (this.text.length) {
         const t = breakText({
            ctx: context,
            text: this.text,
            width: this.width,
         }).join("\n");
         super.renderText({
            context,
            text: t,
         });
      }

      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      // New rotation-aware resize logic
      const newBounds = resizeWithRotation({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 20,
         minHeight: 20,
      });

      // Adjust height for text if needed
      const adjustedHeight = this.adjustHeight(newBounds.height);

      this.setTarget({
         left: newBounds.left,
         top: newBounds.top,
         width: newBounds.width,
         height: adjustedHeight,
      });

      return super.Resize(current, old, d);
   }
}

export default Rect;
