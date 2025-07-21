import type { Point, ShapeProps } from "@/board/types";
import Path, { type PathProps } from "./path";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import Box from "@/board/utils/box";

class SimplePath extends Path {
   constructor(props: ShapeProps & PathProps) {
      super({ ...props });
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new SimplePath({ ...props, points: this.points });
   }

   scaleShape(): void {}

   draw({ ctx, active, addStyles, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      if (this.points.length < 2) return;

      context.save();
      context.beginPath();
      context.strokeStyle = this.stroke;
      context.lineWidth = this.strokeWidth;
      context.moveTo(this.points[0].x, this.points[0].y);

      for (let i = 1; i < this.points.length; i++) {
         context.lineTo(this.points[i].x, this.points[i].y);
      }

      context.stroke();
      context.closePath();
      context.restore();
   }

   protected _set(key: string, value: any): void {
      super.set(key, value);
      switch (key) {
         case "points":
            this.setCoords();
            break;
      }
   }

   setCoords(): void {
      const box = new Box({
         x1: Infinity,
         y1: Infinity,
         x2: -Infinity,
         y2: -Infinity,
      });
      this.points.forEach((p) => {
         if (p.x < box.x1) {
            box.x1 = p.x;
         }
         if (p.x > box.x2) {
            box.x2 = p.x;
         }

         if (p.y < box.y1) {
            box.y1 = p.y;
         }
         if (p.y > box.y2) {
            box.y2 = p.y;
         }
      });

      this.set({
         left: box.x1,
         top: box.y1,
         width: box.x2 - box.x1,
         height: box.y2 - box.y1,
      });
   }

   IsDraggable(p: Point): boolean {}
}

export default SimplePath;
