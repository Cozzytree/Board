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

      context.save();

      // Rotation logic
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      context.translate(this.left, this.top);

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
         thinning: 0.5,
         smoothing: 0.5,
         streamline: 0.5,
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

      // Draw the smooth stroke
      context.beginPath();

      if (stroke.length > 0) {
         context.moveTo(stroke[0][0], stroke[0][1]);

         for (let i = 1; i < stroke.length; i++) {
            context.lineTo(stroke[i][0], stroke[i][1]);
         }

         context.closePath();
      }

      // Fill the stroke path with the stroke color
      context.fillStyle = resize ? "#808080" : this.stroke;
      context.fill();

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
