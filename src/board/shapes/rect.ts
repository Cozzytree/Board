import { Box, Pointer, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect } from "../utils/resize";
import { breakText, calcPointWithRotation } from "../utils/utilfunc";
import type { DrawProps } from "./shape";

type RectProps = {
   rx?: number;
   ry?: number;
};

class Rect extends Shape {
   declare rx: number;
   declare ry: number;

   constructor(props: ShapeProps & RectProps) {
      super({ ...props });
      this.rx = props.rx || 0;
      this.ry = props.ry || 0;

      this.type = "rect";
      this.verticalAlign = "center";
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Rect({ ...props, rx: this.rx, ry: this.ry });
   }

   mousedown(s: ShapeEventData): void {
      super.mousedown(s);
   }

   mouseup(s: ShapeEventData): void {
      this.width = Math.max(this.width, 20);
      this.height = Math.max(this.height, 20);
      super.mouseup(s);
   }

   IsDraggable(p: Pointer): boolean {
      // Get center of the rectangle
      const centerX = this.left + this.width / 2;
      const centerY = this.top + this.height / 2;

      const dx = p.x - centerX;
      const dy = p.y - centerY;

      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);

      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // 3. Check against unrotated rect bounds
      const halfW = this.width / 2;
      const halfH = this.height / 2;

      return localX > -halfW && localX < halfW && localY > -halfH && localY < halfH;

      // const condition =
      //    p.x > this.left &&
      //    p.x < this.left + this.width &&
      //    p.y > this.top &&
      //    p.y < this.top + this.height;
      // if (condition) {
      //    return true;
      // }
      // return false;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      // const dx = current.x - this._startMouse.x;
      // const dy = current.y - this._startMouse.y;

      // const cos = Math.cos(-this.rotate);
      // const sin = Math.sin(-this.rotate);
      // const localDx = dx * cos - dy * sin;
      // const localDy = dx * sin + dy * cos;

      // const rotatedDx = dx * cos - dy * sin;
      // const rotatedDy = dx * sin + dy * cos;

      // this.left = this._startPos.x + localDx;
      // this.top = this._startPos.y + localDy;
      this.left += dx;
      this.top += dy;

      return super.dragging(prev, current);
   }

   IsResizable(p: Point): resizeDirection | null {
      const { height, width, top, left, rotate } = this;

      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const localBox = new Box({
         x1: -halfW,
         x2: halfW,
         y1: -halfH,
         y2: halfH,
      });
      const d = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding,
      );
      // const d = resizeRect(
      //    calcPointWithRotation({ height, width, left, point: p, rotate, top }),
      //    new Box({
      //       x1: this.left,
      //       x2: this.left + this.width,
      //       y1: this.top,
      //       y2: this.top + this.height,
      //    }),
      //    this.padding,
      // );
      if (d) {
         return d.rd;
      }
      return null;
   }

   draw({ addStyles = true, ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);

      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();

      const currentScale = context.getTransform().a;

      if (resize) {
         context.globalAlpha = 0.5;
         context.strokeStyle = "#808070";
         context.fillStyle = "#606060";
         context.lineWidth = 3 / currentScale;
         context.setLineDash([6 / currentScale, 6 / currentScale]);
      } else {
         context.setLineDash(this.dash);
         context.lineWidth = this.strokeWidth / currentScale;
         context.strokeStyle = this.stroke;
         context.fillStyle = this.fill;
      }

      context.roundRect(this.left, this.top, this.width, this.height, r);
      context.stroke();

      if (addStyles) {
         context.fill();
      }

      context.closePath();
      context.restore();

      if (this.text.length) {
         super.renderText({
            context,
            text: breakText({ ctx: context, text: this.text, width: this.width }).join("\n"),
         });
      }
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      switch (d) {
         case "tl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "tr":
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "br":
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
            break;
         case "bl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }
            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
      }

      return super.Resize(current, old, d);
   }
}

export default Rect;
