import { Line, Shape } from "@/board/index";
import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";
import type { DrawProps } from "../shape";
import type { LineProps } from "../shape_types";

class PlainLine extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
   }
   clone(): Shape {
      const props = super.cloneProps();
      return new PlainLine({ ...props, points: this.points });
   }

   draw({ active = true, ctx }: DrawProps): void {
      const context = ctx || this.ctx;
      context.save();
      context.translate(this.left, this.top);
      if (active) {
         context.beginPath();
         context.fillStyle = "white";
         context.arc(this.points[0].x, this.points[0].y, 4, 0, Math.PI * 2);
         context.arc(this.points[1].x, this.points[1].y, 4, 0, Math.PI * 2);
         context.fill();
         context.closePath();
      }
      context.lineWidth = this.strokeWidth;
      context.strokeStyle = this.stroke;
      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      context.lineTo(this.points[1].x, this.points[1].y);
      context.stroke();
      context.restore();
   }

   Resize(current: Point, b: BoxInterface, resize: resizeDirection): void {
      const index = resize === "br" ? this.points.length - 1 : this.resizeIndex;
      if (index === null || index < 0 || index > this.points.length - 1) return;
      this.points[index] = {
         x: current.x - this.left,
         y: current.y - this.top,
      };
   }
}

export default PlainLine;
