import type { ShapeProps } from "@/board/types";
import type { LineProps } from "../shape_types";
import Line from "./line";
import type Shape from "../shape";
import type { DrawProps } from "../shape";

class LineCurve extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props)
      this.lineType = "curve"
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new LineCurve({ ...props, points: this.points });
   }

   draw({ ctx, resize = false }: DrawProps): void {
      if (this.points.length == 0) return;
      const context = this.ctx || ctx;
      context.save();

      if (resize) {
         context.globalAlpha = 0.5;
      }

      context.lineWidth = this.strokeWidth;
      context.strokeStyle = this.stroke

      context.beginPath()
      context.moveTo(this.points[0].x, this.points[0].y)
      console.log(this.points);
      context.quadraticCurveTo(
         this.points[0].x / 2,
         this.points[0].y / 2,
         (this.points[0].x + this.points[1].x) / 2,
         (this.points[0].y + this.points[1].y) / 2,
      )
      context.quadraticCurveTo(
         this.points[1].x / 2,
         this.points[1].y / 2,
         (this.points[1].x + this.points[2].x) / 2,
         (this.points[1].y + this.points[2].y) / 2,
      )

      context.stroke();
      context.restore();
   }
}

export default LineCurve;