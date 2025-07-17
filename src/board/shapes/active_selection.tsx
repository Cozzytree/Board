import { Box, Ellipse, Shape } from "../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeEventData,
   ShapeProps,
} from "../types";
import { IsIn } from "../utils/utilfunc";

type ActiveSeletionProps = {
   shapes?: Shape[];
};

class ActiveSelection extends Shape {
   declare shapes: Shape[];
   constructor(props: ShapeProps & ActiveSeletionProps) {
      super(props);
      this.shapes = props.shapes || [];
      this.type = "selection";
      this.fill = "#505045";
      this.stroke = "#606055";
   }

   ID(): string {
      return this.id;
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

   IsResizable(): resizeDirection | null {
      return null;
   }

   dragging(prev: Point, current: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.shapes.forEach((s) => {
         s.dragging(prev, current);
         this.draw({ active: false, addStyles: false, ctx: this.board.ctx2 });
      });

      this.left += dx;
      this.top += dy;
   }

   draw(options: {
      active: boolean;
      ctx?: CanvasRenderingContext2D;
      addStyles?: boolean;
   }): void {
      const context = options.ctx || this.ctx;

      this.activeRect(context);
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

   mouseup(s: ShapeEventData): void {
      this.shapes = [];
      let updateBox = new Box({
         x1: Infinity,
         x2: -Infinity,
         y1: Infinity,
         y2: -Infinity,
      });

      const outer = new Box({
         x1: this.left,
         x2: this.left + this.width,
         y1: this.top,
         y2: this.top + this.height,
      });

      this.board.shapeStore.forEach((s) => {
         const inner = new Box({
            x1: s.left,
            x2: s.left + s.width,
            y1: s.top,
            y2: s.top + s.height,
         });
         if (s instanceof Ellipse) {
            inner.x1 = inner.x1 - s.rx;
            inner.y1 = inner.y1 - s.ry;
            inner.x2 = inner.x1 + s.width;
            inner.y2 = inner.y1 + s.height;
         }
         if (IsIn({ inner, outer })) {
            this.shapes.push(s);
            updateBox = updateBox.compareAndReturnSmall(inner);
         }

         return false;
      });

      if (this.shapes.length > 1) {
         this.left = updateBox.x1 - this.padding;
         this.top = updateBox.y1 - this.padding;
         this.width = updateBox.x2 - updateBox.x1 + this.padding * 2;
         this.height = updateBox.y2 - updateBox.y1 + this.padding * 2;
         this.board.shapeStore.insert(this);
      }

      this.emit("mouseup", s);
   }

   mousedown(): void {}
}

export default ActiveSelection;
