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

abstract class Path extends Shape {
   declare points: Point[];
   private lastPoints: Point[];

   abstract scaleShape(): void;

   constructor(props: ShapeProps & PathProps) {
      super(props);
      this.points = props.points || [];
      this.type = "path";
      this.lastPoints = [];
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

      context.save();
      if (active) {
         this.activeRect();
      }
      context.translate(this.left, this.top);
      if (resize) {
         context.strokeStyle = "#808070";
         context.fillStyle = "#606060";
         context.lineWidth = 3;
         context.setLineDash([6, 6]);
      } else {
         context.lineWidth = this.strokeWidth;
         context.strokeStyle = this.stroke;
         context.fillStyle = this.fill;
      }
      context.scale(this.scale, this.scale);

      context.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
         context.lineTo(this.points[i].x, this.points[i].y);
      }
      if (addStyles) {
         context.fill();
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
         this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
         return rs.rd;
      }
      return null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      let newWidth = this.width;
      let newHeight = this.height;

      switch (d) {
         case "br":
            if (current.x > old.x1) {
               newWidth = current.x - old.x1;
            } else {
               newWidth = old.x1 - current.x;
               this.left = current.x;
            }

            if (current.y > old.y1) {
               newHeight = current.y - old.y1;
            } else {
               newHeight = old.y1 - current.y;
               this.top = current.y;
            }
            break;
         case "tl":
            if (current.x < old.x2) {
               this.left = current.x;
               newWidth = old.x2 - current.x;
            } else {
               this.left = old.x2;
               newWidth = current.x - old.x2;
            }

            if (current.y < old.y2) {
               this.top = current.y;
               newHeight = old.y2 - current.y;
            } else {
               this.top = old.y2;
               newHeight = current.y - old.y2;
            }
      }

      const widthDiff = newWidth - (old.x2 - old.x1);
      const heightDiff = newHeight - (old.y2 - old.y1);
      this.points.forEach((p, i) => {
         p.x = this.lastPoints[i].x + widthDiff;
         p.y = this.lastPoints[i].x + heightDiff;
      });
      this.scaleShape();
      this.width = newWidth;
      this.height = newHeight;
   }

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }
}

export default Path;
