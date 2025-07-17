import { Box, Pointer, Shape } from "../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../types";
import { resizeRect } from "../utils/resize";

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

   ID(): string {
      return this.id;
   }

   IsDraggable(p: Pointer): boolean {
      const condition =
         p.x > this.left - this.rx &&
         p.x < this.left - this.rx + this.width &&
         p.y > this.top - this.ry - this.ry &&
         p.y < this.top - this.ry + this.height;
      if (condition) {
         return true;
      }
      return false;
   }

   IsResizable(p: Point): resizeDirection | null {
      const d = resizeRect(
         p,
         new Box({
            x1: this.left - this.rx,
            x2: this.left + this.rx,
            y1: this.top - this.ry,
            y2: this.top + this.ry,
         }),
         this.padding,
      );

      if (d) {
         return d.rd;
      }
      return null;
   }

   dragging(prev: Point, current: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left += dx;
      this.top += dy;
   }

   activeRect(): void {
      const pad = this.padding;
      const x = this.left - (pad + this.rx);
      const y = this.top - (pad + this.ry);
      const w = this.width + pad * 2;
      const h = this.height + pad * 2;

      // Draw outer rectangle
      this.ctx.beginPath();
      this.ctx.strokeStyle = "white";
      this.ctx.rect(x, y, w, h);
      this.ctx.stroke();
      this.ctx.closePath();

      // Draw corner dots
      const drawDot = (cx: number, cy: number) => {
         this.ctx.beginPath();
         this.ctx.fillStyle = "white";
         this.ctx.rect(cx - 3, cy - 3, 6, 6);
         this.ctx.fill();
         this.ctx.closePath();
      };

      drawDot(x, y); // top-left
      drawDot(x + w, y); // top-right
      drawDot(x, y + h); // bottom-left
      drawDot(x + w, y + h); // bottom-right
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
      if (active) {
         this.activeRect();
      }
      const context = ctx || this.ctx;

      context.beginPath();
      context.fillStyle = this.fill;
      context.strokeStyle = this.stroke;

      context.ellipse(this.left, this.top, this.rx, this.ry, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.closePath();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      // const oldX1 = old.x1 - this.rx;
      // const oldX2 = old.x1 + this.rx;
      // const oldY1 = old.y1 - this.ry;
      // const oldY2 = old.y2 + this.ry;

      // centered resize
      this.rx = Math.max(Math.abs(current.x - old.x1), 5);
      this.ry = Math.max(Math.abs(current.y - old.y1), 5);
      this.width = this.rx * 2;
      this.height = this.ry * 2;

      // switch (d) {
      //    case "tl":
      //       if (current.x > oldX2) {
      //          this.rx = (current.x - oldX2) / 2;
      //          this.left = oldX2 + this.rx;
      //       } else {
      //          this.rx = (oldX2 - current.x) / 2;
      //          this.left = current.x + this.rx;
      //       }

      //       if (current.y > oldY2) {
      //          this.ry = (current.y - oldY2) / 2;
      //          this.top = oldY2 + this.ry;
      //       } else {
      //          this.ry = (oldY2 - current.y) / 2;
      //          this.top = current.y + this.ry;
      //       }

      //       this.width = this.rx * 2;
      //       this.height = this.ry * 2;

      //       break;
      //    case "tr":
      //       if (current.x < old.x1) {
      //          this.left = current.x;
      //          this.width = old.x1 - current.x;
      //       } else {
      //          this.left = old.x1;
      //          this.width = current.x - old.x1;
      //       }

      //       if (current.y > old.y2) {
      //          this.top = old.y2;
      //          this.height = current.y - old.y2;
      //       } else {
      //          this.top = current.y;
      //          this.height = old.y2 - current.y;
      //       }
      //       break;
      //    case "br":
      //       if (current.x < old.x1) {
      //          this.left = current.x;
      //          this.width = old.x1 - current.x;
      //       } else {
      //          this.left = old.x1;
      //          this.width = current.x - old.x1;
      //       }

      //       if (current.y > old.y1) {
      //          this.top = old.y1;
      //          this.height = current.y - old.y1;
      //       } else {
      //          this.top = current.y;
      //          this.height = old.y1 - current.y;
      //       }
      //       break;
      //    case "bl":
      //       if (current.x > old.x2) {
      //          this.left = old.x2;
      //          this.width = current.x - old.x2;
      //       } else {
      //          this.left = current.x;
      //          this.width = old.x2 - current.x;
      //       }
      //       if (current.y > old.y1) {
      //          this.top = old.y1;
      //          this.height = current.y - old.y1;
      //       } else {
      //          this.top = current.y;
      //          this.height = old.y1 - current.y;
      //       }
      // }
   }
}

export default Ellipse;
