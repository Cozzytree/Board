import { isPointNearSegment } from "@/board/utils/utilfunc";
import { Pointer, Shape } from "../../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeEventData,
   ShapeProps,
} from "../../types";
import type { DrawProps } from "../shape";

type LineType = "curve" | "straight";

type LineProps = {
   points?: Point[];
   lineType?: LineType;
};

type Connection = {
   s: Shape;
};

abstract class Line extends Shape {
   declare points: Point[];
   declare lineType: LineType;
   declare startShape: Connection | null;
   declare endShape: Connection | null;
   declare arrowS: boolean;
   declare arrowE: boolean;

   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.type = "line";
      this.lineType = props.lineType || "straight";
      this.arrowS = true;
      this.arrowE = false;
      this.points =
         this.points && this.points.length < 2
            ? [
                 { x: 0, y: 0 },
                 { x: this.width, y: this.height },
              ]
            : [
                 { x: 0, y: 0 },
                 { x: this.width, y: this.height },
              ];
   }

   protected renderArrow(ctx: CanvasRenderingContext2D) {}

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {}

   draw(options: DrawProps): void {}

   IsDraggable(p: Point): boolean {
      for (let i = 0; i < this.points.length - 1; i++) {
         const a = this.points[i];
         const b = this.points[i + 1];
         if (
            isPointNearSegment({
               a: new Pointer({ x: a.x + this.left, y: a.y + this.top }),
               b: new Pointer({ x: b.x + this.left, y: b.y + this.top }),
               c: p,
            })
         ) {
            console.log("true");
            return true;
         }
      }
      return false;
   }

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }

   mouseover(s: ShapeEventData): void {
      if (this.IsDraggable(s.e.point)) {
         document.body.style.cursor = "pointer";
      }
      this.emit("mouseover", s);
   }
}

export default Line;
