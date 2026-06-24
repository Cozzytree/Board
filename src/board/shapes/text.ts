import type { BoxInterface, Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import { calcPointWithRotation } from "../utils/utilfunc";
import Shape, { type DrawProps } from "./shape";
import { resizeRect } from "@/board/utils/resize";

class Text extends Shape {
   constructor(props: ShapeProps) {
      super(props);
      this.type = "text";
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new Text(props);
   }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      const lines = this.text.split("\n");
      const fontSize = this.fontSize || 20;
      // Base lineHeight approximation is 1.2 * fontSize
      const lineHeight = fontSize * 1.2;

      // Convert textAlign to text-anchor
      let textAnchor = "start";
      let xOffset = this.left;
      if (this.textAlign === "center") {
         textAnchor = "middle";
         xOffset = this.left + this.width / 2;
      } else if (this.textAlign === "right") {
         textAnchor = "end";
         xOffset = this.left + this.width;
      }

      let tspanElements = lines.map((line, i) => {
         // Canvas textBaseline="top" means the Y coordinate is the top of the em-box.
         // In SVG, dominant-baseline="text-before-edge" simulates this.
         return `<tspan x="${xOffset}" dy="${i === 0 ? 0 : lineHeight}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`;
      }).join("");

      const fontFamily = this.fontFamily === "1" ? "'Virgil', sans-serif" : "system-ui, sans-serif";

      return `<text x="${xOffset}" y="${this.top}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${this.fontWeight}" text-anchor="${textAnchor}" dominant-baseline="text-before-edge" ${attrs}>${tspanElements}</text>`;
   }

   draw({ ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      const currentScale = context.getTransform().a;
      if (resize) {
         context.globalAlpha = 0.5;

         context.beginPath();
         context.lineWidth = this.selectionStrokeWidth;
         context.strokeStyle = this.selectionColor;
         context.rect(this.left, this.top, this.width, this.height);
         context.setLineDash([
            this.selectionStrokeWidth / currentScale,
            this.selectionStrokeWidth / currentScale,
         ]);
         context.stroke();
         context.closePath();
      }

      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();
      context.globalAlpha = this.opacity;

      super.renderText({ context, text: this.text });
      context.closePath();
      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      let newHeight = 0,
         newWidth = 0;
      switch (d) {
         case "t":
            if (current.y > old.y2) {
               super.setSilent({
                  top: old.y2,
               });
               newHeight = current.y - old.y2;
            } else {
               super.setSilent({
                  top: current.y,
               });
               newHeight = old.y1 - current.y;
            }
            break;
         case "b":
            if (current.y > old.y1) {
               super.setSilent({
                  top: old.y1,
               });
               newHeight = current.y - old.y1;
            } else {
               super.setSilent({
                  top: current.y,
               });
               newHeight = old.y2 - current.y;
            }
            break;
         case "l":
            if (current.x > old.x2) {
               super.setSilent({
                  left: old.x2,
               });
               newWidth = current.x - old.x2;
            } else {
               super.setSilent({
                  left: current.x,
               });
               newWidth = old.x2 - current.x;
            }
            break;
         case "r":
            if (current.x > old.x1) {
               super.setSilent({
                  left: old.x1,
                  width: current.x - old.x1,
               });
               newWidth = current.x - old.x1;
            } else {
               super.setSilent({
                  left: current.x,
                  width: old.x1 - current.x,
               });
               newWidth = old.x1 - current.x;
            }
            break;
         case "tl":
            if (current.x > old.x2) {
               this.left = old.x2;
               newWidth = current.x - old.x2;
            } else {
               this.left = current.x;
               newWidth = old.x2 - current.x;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               newHeight = current.y - old.y2;
            } else {
               this.top = current.y;
               newHeight = old.y2 - current.y;
            }
            break;
         case "tr":
            if (current.x < old.x1) {
               this.left = current.x;
               newWidth = old.x1 - current.x;
            } else {
               this.left = old.x1;
               newWidth = current.x - old.x1;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               newHeight = current.y - old.y2;
            } else {
               this.top = current.y;
               newHeight = old.y2 - current.y;
            }
            break;
         case "br":
            if (current.x - old.x1 <= this.fontSize || current.y - old.y1 <= this.fontSize) return;
            if (current.x < old.x1) {
               this.left = current.x;
               newWidth = old.x1 - current.x;
            } else {
               this.left = old.x1;
               newWidth = current.x - old.x1;
            }

            if (current.y > old.y1) {
               this.top = old.y1;
               newHeight = current.y - old.y1;
            } else {
               this.top = current.y;
               newHeight = old.y1 - current.y;
            }
            break;
         case "bl":
            if (current.x > old.x2) {
               this.left = old.x2;
               newWidth = current.x - old.x2;
            } else {
               this.left = current.x;
               newWidth = old.x2 - current.x;
            }
            if (current.y > old.y1) {
               this.top = old.y1;
               newHeight = current.y - old.y1;
            } else {
               this.top = current.y;
               newHeight = old.y1 - current.y;
            }
      }

      this.setTarget({
         width: newWidth,
         height: this.adjustHeight(newHeight)
      })
      // this.setSilent({ width: newWidth, height: this.adjustHeight(newHeight) });
      return super.Resize(current, old, d);
   }

   IsDraggable(p: Point): boolean {
      const condition =
         p.x > this.left &&
         p.x < this.left + this.width &&
         p.y > this.top &&
         p.y < this.top + this.height;
      if (condition) {
         return true;
      }
      return false;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.dragTarget(
         dx,
         dy,
      )
      // this.set({
      // });
      // this.left += dx;
      // this.top += dy;

      return super.dragging(prev, current);
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const localBox = new Box({
         x1: -width / 2,
         x2: width / 2,
         y1: -height / 2,
         y2: height / 2,
      });
      const d = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );
      if (d) {
         return d.rd;
      }

      return null;
   }
}

export default Text;
