import { Box, Pointer, Shape } from "../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../types";
import { resizeRect } from "../utils/resize";

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

   ID(): string {
      return this.id;
   }

   draw({
      active,
      addStyles = true,
      ctx,
   }: {
      active: boolean;
      ctx?: CanvasRenderingContext2D;
      addStyles?: boolean;
   }): void {
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

      context.strokeStyle = this.stroke;
      context.fillStyle = this.fill;

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
