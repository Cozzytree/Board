import Line from "./line";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import type { LineProps } from "../shape_types";
import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";

class LineAnchor extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.points = props.points || [];
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new LineAnchor({ ...props, points: this.points });
   }

   draw({ ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;
      context.save();
      context.translate(this.left, this.top);

      if (resize) {
         context.globalAlpha = 0.5;
      }
      context.lineWidth = this.strokeWidth;
      context.strokeStyle = this.stroke;
      context.beginPath();

      context.moveTo(this.points[0].x, this.points[0].y);
      this.points.forEach((p) => {
         context.lineTo(p.x, p.y);
      });

      context.stroke();
      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      super.Resize(current, old, d);
      const maxX = Math.max(this.points[this.points.length - 1].x, this.points[0].x);
      const minX = Math.min(this.points[this.points.length - 1].x, this.points[0].x);

      const maxY = Math.max(this.points[this.points.length - 1].y, this.points[0].y);
      const minY = Math.min(this.points[this.points.length - 1].y, this.points[0].y);

      const width = maxX - minX;
      const height = maxY - minY;
      const midWidth = width / 2;
      const midHeight = height / 2;

      this.points[1] = {
         x: height > 200 ? this.points[0].x : minX + midWidth,
         y: height > 200 ? minY + midHeight : this.points[0].y,
      };
      this.points[2] = {
         x: height > 200 ? this.points[this.points.length - 1].x : minX + midWidth,
         y: height > 200 ? minY + midHeight : this.points[this.points.length - 1].y,
      };
   }
}

export default LineAnchor;
