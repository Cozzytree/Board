import { resizeRect } from "../../utils/resize";
import { Box, Shape } from "../../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../../types";
import { IsIn } from "../../utils/utilfunc";
import type { DrawProps } from "../shape";

export type PathProps = {
   points?: Point[];
};

class Path extends Shape {
   declare points: Point[];

   constructor(props: ShapeProps & PathProps) {
      super(props);
      this.points = props.points || [];
      this.type = "path";
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

   draw({ ctx, active, addStyles, resize }: DrawProps): void {
      if (this.points.length < 2) return;
      const context = ctx || this.ctx;

      if (active) {
         this.activeRect(context);
      }

      context.save();
      context.translate(this.left, this.top);
      context.scale(this.scale, this.scale);
      context.moveTo(this.points[0].x, this.points[0].y);
      context.strokeStyle = this.stroke;
      context.lineWidth = this.strokeWidth;
      for (let i = 1; i < this.points.length; i++) {
         context.lineTo(this.points[i].x, this.points[i].y);
      }
      context.closePath();
      context.stroke();
      context.restore();
   }

   IsResizable(p: Point) {
      const rs = resizeRect(
         p,
         new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
         this.padding,
      );
      if (rs) {
         return rs.rd;
      }
      return null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {}

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }
}

export default Path;
