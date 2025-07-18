import { Box, Pointer, Shape } from "../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeEventData,
   ShapeProps,
} from "../types";
import { resizeRect } from "../utils/resize";
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
      this.type = "rect";
      this.rx = props.rx || 0;
      this.ry = props.ry || 0;

      this.type = "rect";
   }

   mousedown(s: ShapeEventData): void {}

   mouseup(s: ShapeEventData): void {}

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

   IsDraggable(p: Pointer): boolean {
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

   dragging(prev: Point, current: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left += dx;
      this.top += dy;
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

   draw({ active, addStyles = true, ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      const r = Math.min(
         this.rx || 0,
         this.ry || 0,
         this.width / 2,
         this.height / 2,
      );

      if (active) {
         this.activeRect();
      }
      context.save();
      context.beginPath();

      if (resize) {
         context.strokeStyle = "#808070";
         context.fillStyle = "#606060";
         context.lineWidth = 3;
         context.setLineDash([6, 6]);
      } else {
         context.lineWidth = this.strokeWidth;
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
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
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
   }
}

export default Rect;
