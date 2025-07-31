import type { Point, ShapeProps } from "@/board/types";
import Path, { type PathProps } from "./path";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import Box from "@/board/utils/box";
import { IsIn } from "@/board/utils/utilfunc";

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

   scaleShape(): void {}

   draw({ ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      if (this.points.length < 2) return;

      context.save();

      context.translate(this.left, this.top);
      context.beginPath();

      if (resize) {
         context.strokeStyle = "#808080";
         context.lineWidth = 3;
      } else {
         context.strokeStyle = this.stroke;
         context.lineWidth = this.strokeWidth;
      }

      let startX = this.points[0].x;
      let startY = this.points[0].y;

      if (this.flipX) {
         startX = this.width - startX;
      }

      if (this.flipY) {
         startY = this.height - startY;
      }

      context.moveTo(startX, startY);

      for (let i = 1; i < this.points.length - 1; i++) {
         let x = this.points[i].x;
         let y = this.points[i].y;

         if (this.flipX) {
            x = this.width - x;
         }

         if (this.flipY) {
            y = this.height - y;
         }
         context.lineTo(x, y);
      }

      // for (let i = 1; i < this.points.length - 1; i++) {
      //    const midX = (this.points[i].x + this.points[i + 1].x) / 2;
      //    const midY = (this.points[i].y + this.points[i + 1].y) / 2;
      //    context.quadraticCurveTo(
      //       this.points[i].x,
      //       this.points[i].y,
      //       midX,
      //       midY,
      //    );
      // }
      // Draw last segment
      // const last = this.points[this.points.length - 1];
      // context.lineTo(last.x, last.y);

      context.stroke();
      context.closePath();
      context.restore();
   }

   IsDraggable(p: Point): boolean {
      return IsIn({
         inner: new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 }),
         outer: new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
      });
   }

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }
}

export default SimplePath;
