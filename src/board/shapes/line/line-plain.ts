import { Line } from "@/board/index";
import type { Point, resizeDirection, ShapeProps } from "@/board/types";
import type { DrawProps } from "../shape";

class PlainLine extends Line {
   constructor(props: ShapeProps) {
      super(props);
   }

   IsResizable(p: Point): resizeDirection | null {
      this.points.forEach((po) => {
         const dx = Math.abs(po.x + this.left - p.x);
         const dy = Math.abs(po.y + this.top - p.y);
         if (dx < this.padding && dy < this.padding) {
            return;
         }
      });
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
}

export default PlainLine;
