import { Box, Pointer, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect } from "../utils/resize";
import { breakText } from "../utils/utilfunc";
import type { DrawProps } from "./shape";

type EllipseProps = {
   rx?: number;
   ry?: number;
};

class Ellipse extends Shape {
   declare rx: number;
   declare ry: number;

   constructor(props: ShapeProps & EllipseProps) {
      super(props);
      this.rx = props.rx || 10;
      this.ry = props.ry || 10;
      this.width = this.rx * 2;
      this.height = this.ry * 2;

      this.type = "ellipse";
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Ellipse({ ...props, rx: this.rx, ry: this.ry });
   }

   IsDraggable(p: Pointer): boolean {
      // const condition =
      //    p.x > this.left &&
      //    p.x < this.left - this.width &&
      //    p.y > this.top &&
      //    p.y < this.top - this.height;
      // if (condition) {
      //    return true;
      // }
      // return false;
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
   }

   IsResizable(p: Point): resizeDirection | null {
      const d = resizeRect(
         p,
         new Box({
            x1: this.left,
            x2: this.left + this.width,
            y1: this.top,
            y2: this.top + this.height,
         }),
         this.padding,
      );

      if (d) {
         return d.rd;
      }
      return null;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left += dx;
      this.top += dy;

      return super.dragging(prev, current);
   }

   mouseup(s: ShapeEventData): void {
      super.set({
         width: this.rx * 2,
         height: this.ry * 2,
      });
      super.mouseup(s);
   }

   mouseover(s: ShapeEventData): void {
      const r = resizeRect(
         s.e.point,
         new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
         this.padding,
      );
      if (r) {
         switch (r.rd) {
            case "tl":
            case "br":
               document.body.style.cursor = "nwse-resize";
               break;

            case "tr":
            case "bl":
               document.body.style.cursor = "nesw-resize";
               break;

            case "t":
            case "b":
               document.body.style.cursor = "ns-resize";
               break;

            case "l":
            case "r":
               document.body.style.cursor = "ew-resize";
               break;
         }
      }

      this.emit("mouseover", s);
   }

   draw({ addStyles = true, ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      context.save();
      context.beginPath();

      const currentScale = context.getTransform().a;

      if (resize) {
         context.strokeStyle = this.selectionColor;
         context.lineWidth = this.selectionStrokeWidth / currentScale;
         context.setLineDash([
            this.selectionStrokeWidth / currentScale,
            this.selectionStrokeWidth / currentScale,
         ]);
      } else {
         context.setLineDash(this.dash);
         context.lineWidth = this.strokeWidth / currentScale;
         context.strokeStyle = this.stroke;
         context.fillStyle = this.fill;
      }

      context.ellipse(this.left + this.rx, this.top + this.ry, this.rx, this.ry, 0, 0, Math.PI * 2);

      if (addStyles) {
         context.fill();
      }

      context.stroke();
      context.closePath();
      context.restore();

      if (this.text.length) {
         super.renderText({
            context,
            text: breakText({ ctx: context, text: this.text, width: this.width }).join("\n"),
         });
      }
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      // const oldX1 = old.x1 - this.rx;
      // const oldX2 = old.x1 + this.rx;
      // const oldY1 = old.y1 - this.ry;
      // const oldY2 = old.y2 + this.ry;

      // centered resize
      // this.rx = Math.max(Math.abs(Math.abs(current.x - old.x1) / 2), 5);
      // this.ry = Math.max(Math.abs(Math.abs(current.y - old.y1) / 2), 5);

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

      this.rx = this.width / 2;
      this.ry = this.height / 2;
   }

   _set(key: string, value: any) {
      super._set(key, value);
      switch (key) {
         case "rx":
            this.rx = value;
            this.set("width", value * 2);
            break;

         case "ry":
            this.ry = value;
            this.set("height", value * 2);
            break;
      }
      return this;
   }
}

export default Ellipse;
