import { keysNotNeeded } from "../constants";
import { Box, Ellipse, Shape } from "../index";
import type {
   BoxInterface,
   Identity,
   Point,
   resizeDirection,
   ShapeEventData,
   ShapeProps,
} from "../types";
import { resizeRect } from "../utils/resize";
import { IsIn } from "../utils/utilfunc";
import type { ActiveSelectionShape } from "./shape_types";

export type ActiveSeletionProps = {
   shapes?: { oldProps?: BoxInterface; s: Shape }[];
};

class ActiveSelection extends Shape {
   private setUp = 0;
   declare shapes: ActiveSelectionShape[];
   constructor(props: ShapeProps & ActiveSeletionProps) {
      super(props);
      this.shapes = props.shapes || [];
      this.type = "selection";
      this.fill = "#505045";
      this.stroke = "#606055";

      if (this.shapes.length) {
         let newBox = new Box({
            x1: Infinity,
            x2: -Infinity,
            y1: Infinity,
            y2: -Infinity,
         });

         this.shapes.forEach((s) => {
            const inner = new Box({
               x1: s.s.left,
               x2: s.s.left + s.s.width,
               y1: s.s.top,
               y2: s.s.top + s.s.height,
            });
            if (s instanceof Ellipse) {
               inner.x1 = inner.x1 - s.rx;
               inner.y1 = inner.y1 - s.ry;
               inner.x2 = inner.x1 + s.width;
               inner.y2 = inner.y1 + s.height;
            }
            newBox = newBox.compareAndReturnSmall(inner);
         });
         this.left = newBox.x1 - this.padding;
         this.top = newBox.y1 - this.padding;
         this.width = newBox.x2 - newBox.x1 + this.padding * 2;
         this.height = newBox.y2 - newBox.y1 + this.padding * 2;
      }
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new ActiveSelection({
         ...props,
         shapes: this.shapes.map((s) => ({ s: s.s.clone() })),
      });
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

   dragging(prev: Point, current: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.shapes.forEach((s) => {
         s.s.dragging(prev, current);
         this.draw({ active: false, addStyles: false, ctx: this._board.ctx2 });
      });

      this.left += dx;
      this.top += dy;
   }

   draw(options: { active: boolean; ctx?: CanvasRenderingContext2D; addStyles?: boolean }): void {
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

            this.shapes.forEach((s) => {
               if (s.oldProps)
                  s.s.Resize(
                     {
                        x: current.x + (s.oldProps.x1 - current.x),
                        y: current.y + (s.oldProps.y1 - current.y),
                     },
                     s.oldProps,
                     d,
                  );
            });

            break;
         case "tr":
            this.shapes.forEach((s) => {
               if (s.oldProps)
                  s.s.Resize(
                     {
                        x: current.x - (current.x - s.oldProps.x2),
                        y: current.y - (current.y - s.oldProps.y2),
                     },
                     s.oldProps,
                     d,
                  );
            });

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
      if (this.setUp == 0) {
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

         this._board.shapeStore.forEach((s) => {
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
               this.shapes.push({ s });
               updateBox = updateBox.compareAndReturnSmall(inner);
            }

            return false;
         });

         if (this.shapes.length > 1) {
            this.left = updateBox.x1 - this.padding;
            this.top = updateBox.y1 - this.padding;
            this.width = updateBox.x2 - updateBox.x1 + this.padding * 2;
            this.height = updateBox.y2 - updateBox.y1 + this.padding * 2;
            this._board.add(this);
         }
      }

      this.setUp++;
      this.emit("mouseup", s);
   }

   mousedown(e: ShapeEventData): void {
      this.emit("mousedown", e);
   }

   toObject(): Identity<Shape> {
      const obj = {} as { [K in keyof this]: this[K] | unknown };
      for (const key of Object.keys(this) as Array<keyof this>) {
         const strKey = String(key);
         if (!strKey.startsWith("_") && !keysNotNeeded.includes(strKey)) {
            if (strKey === "shapes") {
               const shapes = this[strKey];
               const s = shapes.map((s) => s.s.toObject());
               obj[key] = s;
            } else {
               obj[key] = this[key];
            }
         }
      }
      return obj;
   }
}

export default ActiveSelection;
