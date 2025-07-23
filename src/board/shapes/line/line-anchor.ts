import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";
import Line from "./line";
import type { DrawProps } from "../shape";
import type Shape from "../shape";
import type { LineProps } from "../shape_types";

class LineAnchor extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.points = props.points || [];
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new LineAnchor({ ...props, points: this.points });
   }

   draw({ active, ctx }: DrawProps): void {
      const context = ctx || this.ctx;
      context.save();
      context.translate(this.left, this.top);
      if (active) {
         context.beginPath();
         context.fillStyle = "white";
         context.arc(this.points[0].x, this.points[0].y, 4, 0, Math.PI * 2);
         context.arc(
            this.points[this.points.length - 1].x,
            this.points[this.points.length - 1].y,
            4,
            0,
            Math.PI * 2,
         );
         context.fill();
         context.closePath();
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
      const index = d === "br" ? this.points.length - 1 : this.resizeIndex;
      if (index === null || index < 0 || index > this.points.length - 1) return;

      this.points[index] = { x: current.x - this.left, y: current.y - this.top };

      const width = this.points[this.points.length - 1].x - this.points[0].x;
      const height = this.points[this.points.length - 1].y - this.points[0].y;
      const midWidth = width / 2;
      const midHeight = height / 2;

      const absHeight = Math.abs(height);

      this.points[1] = {
         x: absHeight > 200 ? this.points[0].x : midWidth,
         y: absHeight > 200 ? midHeight : this.points[0].y,
      };
      this.points[2] = {
         x: absHeight > 200 ? this.points[this.points.length - 1].x : midWidth,
         y: absHeight > 200 ? midHeight : this.points[this.points.length - 1].y,
      };
   }
}

export default LineAnchor;
