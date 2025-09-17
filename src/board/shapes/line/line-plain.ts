import { Line, Shape } from "@/board/index";
import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";
import type { DrawProps } from "../shape";
import type { connectionEventData, LineProps } from "../shape_types";
import { breakText, intersectLineWithBox } from "@/board/utils/utilfunc";

class PlainLine extends Line {
   constructor(props: ShapeProps & LineProps) {
      super(props);
   }
   clone(): Shape {
      const props = super.cloneProps();
      this.lineType = "straight";
      return new PlainLine({ ...props, points: this.points });
   }

   Resize(current: Point, _: BoxInterface, d: resizeDirection): void {
      super.Resize(current, _, d);
      const mid = {
         x: (this.points[0].x + this.points[this.points.length - 1].x) / 2,
         y: (this.points[0].y + this.points[this.points.length - 1].y) / 2,
      };
      if (this.lineType === "curve" && this.points.length === 4) {
         this.points[1] = {
            x: mid.x,
            y: this.points[0].y,
         };
         this.points[2] = {
            x: mid.x,
            y: this.points[this.points.length - 1].y,
         };
      } else {
         if (this.points.length > 2) {
            this.points[1] = { x: mid.x, y: mid.y };
         }
      }
   }

   connectionEvent({ c, s, p }: connectionEventData): boolean {
      const size = this.connections.size();
      const index = this.points.length - 1;
      const { shapes } = this.connections;

      if (size == 2) {
         const startIndex = shapes[0].connected === "s" ? 0 : 1;
         const endIndex = shapes[0].connected === "s" ? 1 : 0;

         const startBox = [
            shapes[endIndex].s.left,
            shapes[endIndex].s.left + shapes[endIndex].s.width,
            shapes[endIndex].s.top,
            shapes[endIndex].s.top + shapes[endIndex].s.height,
         ];
         const pointStart = intersectLineWithBox(
            p.x,
            p.y, // line start
            this.connections.shapes[endIndex].s.left,
            this.connections.shapes[endIndex].s.top,
            // box
            startBox[0],
            startBox[1],
            startBox[2],
            startBox[3],
         );
         // const pointend = intersectLineWithBox(p.x, p.y);
         if (pointStart.length) {
            this.points[index] = {
               x: pointStart[0][0] - this.left,
               y: pointStart[0][1] - this.top,
            };
         }
      } else {
         const otherSide =
            c.connected == "s"
               ? { x: this.points[index].x, y: this.points[index].y }
               : {
                    x: this.points[0].x,
                    y: this.points[0].y,
                 };
         const points = intersectLineWithBox(
            otherSide.x,
            otherSide.y,
            c.s.left + (c.s.left + (c.coords?.x ?? 0 / 100) * c.s.width),
            c.s.top + (c.s.top + (c.coords?.y ?? 0 / 100) * c.s.height),
            c.s.left,
            c.s.left + c.s.width,
            c.s.top,
            c.s.top + c.s.height,
         );
         if (points.length) {
            console.log(points);
            this.points[c.connected === "s" ? index : 0] = {
               x: points[1][0] - this.left,
               y: points[1][1] - this.top,
            };
         }
      }
      return true;
   }

   draw(options: DrawProps): void {
      const context = options?.ctx || this.ctx;

      context.save();
      context.translate(this.left, this.top);
      if (options?.resize) {
         context.globalAlpha = 0.5;
      }
      context.strokeStyle = this.stroke;
      context.lineWidth = this.strokeWidth;

      context.beginPath();
      context.moveTo(this.points[0].x, this.points[0].y);
      const mid = {
         x: (this.points[0].x + this.points[this.points.length - 1].x) / 2,
         y: (this.points[0].y + this.points[this.points.length - 1].y) / 2,
      };
      context.lineTo(mid.x, mid.y);
      context.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
      context.stroke();

      context.restore();
   }
   // draw({ ctx, resize = false }: DrawProps): void {
   //    if (!this.points) return;
   //    const context = ctx || this.ctx;
   //    context.save();
   //    context.translate(this.left, this.top);

   //    if (resize) {
   //       context.globalAlpha = 0.3;
   //       context.setLineDash([5, 5]);
   //    }

   //    context.lineWidth = this.strokeWidth;
   //    context.strokeStyle = this.fill;
   //    if (this.arrowS) {
   //       this.renderArrow({
   //          arrowLength: 10,
   //          ctx: context,
   //          endPoint: {
   //             x: this.points[0].x,
   //             y: this.points[0].y,
   //          },
   //          startPoint: {
   //             x: this.points[1].x,
   //             y: this.points[1].y,
   //          },
   //       });
   //    }

   //    context.setLineDash(this.dash);
   //    context.lineWidth = this.strokeWidth;
   //    context.strokeStyle = this.fill;

   //    if (this.text.length > 0) {
   //       const lines = this.text.split("\n");
   //       const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
   //       const metrics = context.measureText(longest);

   //       const x0 = this.points[0].x,
   //          y0 = this.points[0].y;
   //       const x1 = this.points[1].x,
   //          y1 = this.points[1].y;
   //       const dx = x1 - x0,
   //          dy = y1 - y0;
   //       const len = Math.hypot(dx, dy);
   //       if (len === 0) {
   //          context.beginPath();
   //          context.moveTo(x0, y0);
   //          context.lineTo(x1, y1);
   //          context.stroke();
   //       } else {
   //          const textHeight =
   //             metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
   //             metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent ||
   //             parseFloat(context.font);
   //          let gapStartDist: number, gapEndDist: number;
   //          const pad = 5 + textHeight / 2;
   //          const mid = len / 2;

   //          switch (this.textAlign) {
   //             case "left":
   //                gapStartDist = pad;
   //                gapEndDist = pad + metrics.width * 1.1;
   //                break;
   //             case "right":
   //                gapEndDist = len - pad;
   //                gapStartDist = gapEndDist - metrics.width;
   //                break;
   //             default:
   //                gapStartDist = mid - metrics.width * 1.1;
   //                gapEndDist = mid + metrics.width * 1.1;
   //                break;
   //          }

   //          const ux = dx / len,
   //             uy = dy / len;
   //          const gapStart = { x: x0 + ux * gapStartDist, y: y0 + uy * gapStartDist };
   //          const gapEnd = { x: x0 + ux * gapEndDist, y: y0 + uy * gapEndDist };

   //          // Before gap
   //          context.beginPath();
   //          context.moveTo(x0, y0);
   //          context.lineTo(gapStart.x, gapStart.y);
   //          context.stroke();
   //          context.stroke();

   //          // After gap
   //          context.beginPath();
   //          context.moveTo(gapEnd.x, gapEnd.y);
   //          context.lineTo(x1, y1);
   //          context.stroke();
   //       }
   //    } else {
   //       context.beginPath();
   //       context.moveTo(this.points[0].x, this.points[0].y);
   //       if (this.lineType === "curve") {
   //          for (let i = 1; i < this.points.length; i++) {
   //             context.quadraticCurveTo(this.points[i - 1].x, this.points[i - 1].y, this.points[i].x, this.points[i].y);
   //          }
   //       }
   //       context.lineTo(this.points[1].x, this.points[1].y);
   //    }

   //    context.beginPath();
   //    context.moveTo(this.points[0].x, this.points[0].y);
   //    const p = this.points;

   //    if (this.lineType === "curve" && p.length === 4) {
   //       // Move to the first point
   //       context.moveTo(p[0].x, p[0].y);

   //       for (let i = 1; i < p.length - 2; i++) {
   //          const xc = (p[i].x + p[i + 1].x) * 0.5;
   //          const yc = (p[i].y + p[i + 1].y) * 0.5;
   //          context.quadraticCurveTo(p[i].x, p[i].y, xc, yc);
   //       }

   //       // Handle the last segment
   //       const penultimate = p[p.length - 2];
   //       const last = p[p.length - 1];
   //       context.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
   //    } else {
   //       // Fallback: simple line between first two points
   //       context.lineTo(p[1].x, p[1].y);
   //    }

   //    context.stroke();
   //    context.restore();
   //    if (this.text.length) {
   //       const lines = breakText({ text: this.text, ctx: context, width: this.width });
   //       super.renderText({ context, text: lines.join("\n") });
   //    }
   // }
}

export default PlainLine;
