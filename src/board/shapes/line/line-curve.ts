import type { Point, resizeDirection, ShapeProps } from "@/board/types";
import type { LineProps } from "../shape_types";
import Line from "./line";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import { isPointNearSegment, rotatePoint } from "@/board/utils/utilfunc";
import Pointer from "@/board/utils/point";
import type { BoxInterface } from "@/board/types";
import { INDICATOR_COLOR } from "../../constants";
import { isDraggableWithRotation } from "../../utils/resize";

class LineCurve extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.lineType = "curve";
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new LineCurve({ ...props, points: this.points });
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

   IsResizable(p: Point): resizeDirection | null {
      if (!this.points.length) return null;

      const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      const testP: Point = this.rotate !== 0 ? rotatePoint(p, center, -this.rotate) : p;

      // Check all points for resizing
      for (let i = 0; i < this.points.length; i++) {
         const dx = Math.abs(this.points[i].x + this.left - testP.x);
         const dy = Math.abs(this.points[i].y + this.top - testP.y);
         if (dx < this.padding && dy < this.padding) {
            this.resizeIndex = i;
            return "b"; // generic handle
         }
      }

      return null;
   }

   Resize(current: Point, oldBox: BoxInterface, d: resizeDirection): Shape[] | void {
      if (this.resizeIndex === 0 || this.resizeIndex === this.points.length - 1) {
         return super.Resize(current, oldBox, d);
      }
      
      if (this.resizeIndex !== null && this.resizeIndex >= 0 && this.resizeIndex < this.points.length) {
         const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
         const adjustedCurrent = this.rotate !== 0 ? rotatePoint(current, center, -this.rotate) : current;
         this.points[this.resizeIndex] = { x: adjustedCurrent.x - this.left, y: adjustedCurrent.y - this.top };
         return undefined;
      }
   }

   activeRect(ctx?: CanvasRenderingContext2D) {
      const context = ctx || this.ctx;
      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      // Compute actual uniform scale using board view scale to avoid transform issues
      const currentScale = this._board.view.scl * this._board.getCanvasDpr();

      const drawDot = (cx: number, cy: number) => {
         // Clamp size so it doesn't overwhelm the shape when zoomed out
         const maxAllowedSize = Math.max(this.width, this.height, 20) * 0.4;
         const size = Math.min(6 / currentScale, maxAllowedSize);
         const strokeWidth = 3 / currentScale;
         context.beginPath();
         context.fillStyle = "black";
         context.strokeStyle = "white";
         context.lineWidth = strokeWidth;
         if (typeof context.roundRect === "function") {
             context.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.5);
         } else {
             context.rect(cx - size / 2, cy - size / 2, size, size);
         }
         context.stroke();
         context.fill();
         context.closePath();
      };

      for (let i = 0; i < this.points.length; i++) {
         drawDot(this.left + this.points[i].x, this.top + this.points[i].y);
      }

      const pad = this.padding;
      const bx = this.left - pad;
      const by = this.top - pad;
      const bw = this.width + pad * 2;
      const bh = this.height + pad * 2;

      context.beginPath();
      context.setLineDash([0,0]);
      context.strokeStyle = INDICATOR_COLOR;
      context.lineWidth = 1 / currentScale;
      context.rect(bx, by, bw, bh);
      context.stroke();
      context.closePath();

      context.restore();
   }

   handleDoubleClick(p: Point): boolean {
      const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      const testP: Point = this.rotate !== 0 ? rotatePoint(p, center, -this.rotate) : p;

      // 1. Check if double clicked on an existing point to delete it
      for (let i = 0; i < this.points.length; i++) {
         const dx = Math.abs(this.points[i].x + this.left - testP.x);
         const dy = Math.abs(this.points[i].y + this.top - testP.y);
         if (dx < this.padding * 2 && dy < this.padding * 2) {
            // Cannot delete if 2 or fewer points
            if (this.points.length > 2) {
               this.points.splice(i, 1);
               this.setCoords();
            }
            return true;
         }
      }

      // 2. Check if double clicked near a segment to add a new point
      for (let i = 0; i < this.points.length - 1; i++) {
         const a = this.points[i];
         const b = this.points[i + 1];
         if (
            isPointNearSegment({
               a: new Pointer({ x: a.x + this.left, y: a.y + this.top }),
               b: new Pointer({ x: b.x + this.left, y: b.y + this.top }),
               c: testP,
               padding: this.padding * 2,
            })
         ) {
            // Insert point
            const newPoint = new Pointer({ x: testP.x - this.left, y: testP.y - this.top });
            this.points.splice(i + 1, 0, newPoint);
            this.setCoords();
            return true;
         }
      }

      return false;
   }

   draw({ ctx, resize = false }: DrawProps): void {
      if (this.points.length < 2) return;
      const context = ctx || this.ctx;
      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.translate(this.left, this.top);
      context.globalAlpha = this.opacity;

      if (resize) {
         context.globalAlpha = 0.5;
      }

      context.setLineDash(this.dash);
      context.lineWidth = this.strokeWidth;
      context.strokeStyle = this.stroke;

      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);

      if (this.points.length === 2) {
         context.lineTo(this.points[1].x, this.points[1].y);
      } else {
         for (let i = 0; i < this.points.length - 1; i++) {
            const p0 = i > 0 ? this.points[i - 1] : this.points[0];
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const p3 = i !== this.points.length - 2 ? this.points[i + 2] : p2;

            // Calculate bezier control points for a Catmull-Rom spline (tension = 1/6)
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
         }
      }

      context.stroke();

      if (this.arrowS) {
         this.renderArrow({ arrowLength: 10, ctx: context, endPoint: this.points[0], startPoint: this.points[1], color: this.stroke });
      }
      if (this.arrowE) {
         const pLast = this.points[this.points.length - 1];
         const pPrev = this.points[this.points.length - 2];
         this.renderArrow({ arrowLength: 10, ctx: context, endPoint: pLast, startPoint: pPrev, color: this.stroke });
      }

      context.restore();
   }
}

export default LineCurve;
