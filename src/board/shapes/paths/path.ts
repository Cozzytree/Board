import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { DrawProps } from "../shape";
import { resizeRect } from "../../utils/resize";
import { Box, Shape } from "../../index";
import { IsIn, flipXandYByDirection, setCoords } from "@/board/utils/utilfunc";

export type PathProps = {
   points?: Point[];
   pathType?: string;
};

class Path extends Shape {
   declare points: Point[];
   lastPoints: Point[];
   declare pathType: string;

   constructor(props: ShapeProps & PathProps) {
      super(props);
      this.points = props.points || [];
      this.lastPoints = this.points.map((p) => {
         return { x: p.x, y: p.y };
      });
      this.type = "path";
   }

   setCoords(): void {
      const { box, points } = setCoords(this.points, this.left, this.top);
      this.set({
         points,
         left: box.x1,
         top: box.y1,
         width: box.x2 - box.x1,
         height: box.y2 - box.y1,
      });
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new Path({ ...props, points: this.points });
   }

   mouseup(s: ShapeEventData): void {
      this.lastPoints = [];
      super.set("lastFlippedState", {
         x: super.get("flipX"),
         y: super.get("flipY"),
      });
      this.setCoords();
      super.mouseup(s);
   }

   IsDraggable(p: Point): boolean {
      return IsIn({
         inner: new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 }),
         outer: new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
      });
   }

   draw({ ctx, addStyles = true, resize }: DrawProps): void {
      if (this.points.length < 2) return;
      const context = ctx || this.ctx;

      context.save();
      context.translate(this.left, this.top);

      const currentScale = context.getTransform().a;

      if (resize) {
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
      context.scale(this.scale, this.scale);

      context.beginPath();

      let startX = this.points[0].x;
      let startY = this.points[0].y;

      if (this.flipX) {
         startX = this.width - startX;
      }

      if (this.flipY) {
         startY = this.height - startY;
      }

      context.moveTo(startX, startY);

      for (let i = 1; i < this.points.length; i++) {
         let x = this.points[i].x;
         let y = this.points[i].y;

         if (this.flipX) {
            x = this.width - x;
         }

         if (this.flipY) {
            y = this.height - y;
         }
         context.lineTo(x, y);
      }
      if (addStyles) {
         context.fill();
      }

      if (!resize) {
         context.fill();
      }
      context.closePath();
      context.stroke();
      context.restore();

      super.renderText({ context });
   }

   IsResizable(p: Point) {
      const rs = resizeRect(
         p,
         new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
         this.padding,
      );
      if (rs) {
         this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
         return rs.rd;
      }
      return null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      let newWidth = this.width;
      let newHeight = this.height;

      let fixedX: number = 0;
      let fixedY: number = 0;

      switch (d) {
         case "br":
            fixedX = old.x1;
            fixedY = old.y1;

            if (current.x > old.x1) {
               newWidth = current.x - old.x1;
            } else {
               newWidth = old.x1 - current.x;
               this.left = current.x;
            }

            if (current.y > old.y1) {
               newHeight = current.y - old.y1;
            } else {
               newHeight = old.y1 - current.y;
               this.top = current.y;
            }
            break;
         case "tl":
            fixedX = old.x2;
            fixedY = old.y2;
            if (current.x < old.x2) {
               this.left = current.x;
               newWidth = old.x2 - current.x;
            } else {
               this.left = old.x2;
               newWidth = current.x - old.x2;
            }

            if (current.y < old.y2) {
               this.top = current.y;
               newHeight = old.y2 - current.y;
            } else {
               this.top = old.y2;
               newHeight = current.y - old.y2;
            }
            break;
         case "bl":
            fixedX = old.x2;
            fixedY = old.y1;
            if (current.x < old.x2) {
               this.left = current.x;
               newWidth = old.x2 - current.x;
            } else {
               this.left = old.x2;
               newWidth = current.x - old.x2;
            }

            if (current.y > old.y1) {
               newHeight = current.y - old.y1;
            } else {
               newHeight = old.y1 - current.y;
               this.top = current.y;
            }
            break;
         case "tr":
            fixedX = old.x1;
            fixedY = old.y2;
            if (current.x > old.x1) {
               newWidth = current.x - old.x1;
            } else {
               newWidth = old.x1 - current.x;
               this.left = current.x;
            }

            if (current.y < old.y2) {
               this.top = current.y;
               newHeight = old.y2 - current.y;
            } else {
               this.top = old.y2;
               newHeight = current.y - old.y2;
            }
      }

      const flip = flipXandYByDirection(
         current,
         fixedX,
         fixedY,
         this.lastFlippedState.x,
         this.lastFlippedState.y,
         d,
         old,
      );

      newWidth = Math.max(newWidth, 20);
      newHeight = Math.max(newHeight, 20);
      const oldWidth = old.x2 - old.x1;
      const oldHeight = old.y2 - old.y1;
      this.points.forEach((p, i) => {
         const original = this.lastPoints[i];
         // % within the box / newVal
         const scaledX = (original.x / oldWidth) * newWidth;
         const scaledY = (original.y / oldHeight) * newHeight;
         p.x = scaledX;
         p.y = scaledY;
      });
      super.set({
         width: newWidth,
         height: newHeight,
         flipX: flip.flipX,
         flipY: flip.flipY,
      });

      return super.Resize(current, old, d);
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left += dx;
      this.top += dy;

      return super.dragging(prev, current);
   }
}

export default Path;
