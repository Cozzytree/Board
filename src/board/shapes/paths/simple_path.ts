import type { Point, ShapeProps } from "@/board/types";
import Path, { type PathProps } from "./path";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import getStroke from "perfect-freehand";
import { isDraggableWithRotation } from "@/board/utils/resize";

// flipX formula
// left + width - this.left + p.x (flipped)

class SimplePath extends Path {
   constructor(props: ShapeProps & PathProps) {
      super({ ...props });
      this.pathType = "simplePath";
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new SimplePath({ ...props, points: this.points });
   }

   scaleShape(): void { }

   draw({ ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      if (this.points.length < 2) return;

      const currentScale = context.getTransform().a;

      if (
         !this._cachedPath ||
         this._cachedScale !== currentScale ||
         this._cachedPointsLen !== this.points.length
      ) {
         this._cachedScale = currentScale;
         this._cachedPointsLen = this.points.length;

         // Transform points based on flip settings
         const transformedPoints = this.points.map((point) => {
            let x = point.x;
            let y = point.y;

            if (this.flipX) {
               x = this.width - x;
            }

            if (this.flipY) {
               y = this.height - y;
            }

            return [x, y, 0.5] as [number, number, number]; // [x, y, pressure]
         });

         // Get smooth stroke outline from perfect-freehand
         const stroke = getStroke(transformedPoints, {
            size: (resize ? 3 : this.strokeWidth) / currentScale,
            thinning: 0.1,
            smoothing: 3,
            streamline: 0.1,
            easing: (t) => t,
            start: {
               taper: 0,
               cap: true,
            },
            end: {
               taper: 0,
               cap: true,
            },
         });

         const p = new Path2D();
         if (stroke.length > 0) {
            p.moveTo(stroke[0][0], stroke[0][1]);

            for (let i = 1; i < stroke.length - 1; i++) {
               const pt = stroke[i];
               const nextPt = stroke[i + 1];
               const midX = (pt[0] + nextPt[0]) / 2;
               const midY = (pt[1] + nextPt[1]) / 2;
               p.quadraticCurveTo(pt[0], pt[1], midX, midY);
            }

            p.closePath();
         }
         this._cachedPath = p;
      }

      context.save();

      // Rotation logic
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      context.translate(this.left, this.top);

      // Fill the stroke path with the stroke color
      context.fillStyle = resize ? "#808080" : this.stroke;
      if (this._cachedPath) {
         context.fill(this._cachedPath);
      }

      context.restore();
   }

   IsDraggable(p: Point): boolean {
      return isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      })
      // return IsIn({
      //    inner: new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 }),
      //    outer: new Box({
      //       x1: this.left,
      //       y1: this.top,
      //       x2: this.left + this.width,
      //       y2: this.top + this.height,
      //    }),
      // });
   }

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }
}

export default SimplePath;
