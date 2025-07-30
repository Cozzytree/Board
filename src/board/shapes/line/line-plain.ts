import { Line, Shape } from "@/board/index";
import type { ShapeProps } from "@/board/types";
import type { DrawProps } from "../shape";
import type { LineProps } from "../shape_types";
import { breakText } from "@/board/utils/utilfunc";

class PlainLine extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
   }
   clone(): Shape {
      const props = super.cloneProps();
      return new PlainLine({ ...props, points: this.points });
   }

   draw({ ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;
      context.save();
      context.translate(this.left, this.top);

      if (this.arrowS) {
         this.renderArrow({
            arrowLength: 20,
            ctx: context,
            endPoint: {
               x: this.points[this.points.length - 1].x,
               y: this.points[this.points.length - 1].y,
            },
            startPoint: {
               x: this.points[0].x,
               y: this.points[0].y,
            },
         });
      }

      if (resize) {
         context.globalAlpha = 0.5;
      }

      context.lineWidth = this.strokeWidth;
      context.strokeStyle = this.stroke;

      if (this.text.length > 0) {
         const lines = this.text.split("\n");
         const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
         const metrics = context.measureText(longest);

         const x0 = this.points[0].x,
            y0 = this.points[0].y;
         const x1 = this.points[1].x,
            y1 = this.points[1].y;
         const dx = x1 - x0,
            dy = y1 - y0;
         const len = Math.hypot(dx, dy);
         if (len === 0) {
            context.beginPath();
            context.moveTo(x0, y0);
            context.lineTo(x1, y1);
            context.stroke();
         } else {
            const textHeight =
               metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
               metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent ||
               parseFloat(context.font);
            let gapStartDist: number, gapEndDist: number;
            const pad = 5 + textHeight / 2;
            const mid = len / 2;

            switch (this.textAlign) {
               case "left":
                  gapStartDist = pad;
                  gapEndDist = pad + metrics.width * 1.1;
                  break;
               case "right":
                  gapEndDist = len - pad;
                  gapStartDist = gapEndDist - metrics.width;
                  break;
               default:
                  gapStartDist = mid - metrics.width * 1.1;
                  gapEndDist = mid + metrics.width * 1.1;
                  break;
            }

            const ux = dx / len,
               uy = dy / len;
            const gapStart = { x: x0 + ux * gapStartDist, y: y0 + uy * gapStartDist };
            const gapEnd = { x: x0 + ux * gapEndDist, y: y0 + uy * gapEndDist };

            // Before gap
            context.beginPath();
            context.moveTo(Math.max(this.points[0].x, x0), Math.max(this.points[0].y, y0));
            context.lineTo(
               Math.max(this.points[0].x, gapStart.x),
               Math.max(this.points[0].y, gapStart.y),
            );
            context.stroke();

            // After gap
            context.beginPath();
            context.moveTo(
               Math.min(this.points[1].x, gapEnd.x),
               Math.min(this.points[1].y, gapEnd.y),
            );
            context.lineTo(Math.min(this.points[1].x, x1), Math.min(this.points[1].y, y1));
            context.stroke();
         }
      } else {
         context.beginPath();
         context.moveTo(this.points[0].x, this.points[0].y);
         context.lineTo(this.points[1].x, this.points[1].y);
      }

      context.stroke();
      context.restore();

      if (this.text.length) {
         const lines = breakText({ text: this.text, ctx: context, width: this.width });
         super.renderText({ context, text: lines.join("\n") });
      }
   }
}

export default PlainLine;
