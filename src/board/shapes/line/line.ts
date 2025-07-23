import { isPointNearSegment, setCoords } from "@/board/utils/utilfunc";
import { Pointer, Shape } from "../../index";
import type { Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { LineProps, LineType } from "../shape_types";

type Connection = {
   s: Shape;
};

abstract class Line extends Shape {
   protected resizeIndex: number | null = null;
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

   IsResizable(p: Point): resizeDirection | null {
      for (let i = 0; i < this.points.length; i++) {
         const dx = Math.abs(this.points[i].x + this.left - p.x);
         const dy = Math.abs(this.points[i].y + this.top - p.y);
         if (dx < this.padding && dy < this.padding) {
            this.resizeIndex = i;
            return "b";
         }
      }

      return null;
   }

   setCoords(): void {
      const { box, points } = setCoords(this.points, this.left, this.top);

      // Step 3: Set the new bounding box and points
      this.set({
         left: box.x1,
         top: box.y1,
         width: box.x2 - box.x1,
         height: box.y2 - box.y1,
         points,
      });
   }

   IsDraggable(p: Point): boolean {
      for (let i = 0; i < this.points.length - 1; i++) {
         const a = this.points[i];
         const b = this.points[i + 1];
         if (
            isPointNearSegment({
               a: new Pointer({
                  x: a.x + this.left - this.padding,
                  y: a.y + this.top - this.padding,
               }),
               b: new Pointer({
                  x: b.x + this.left - this.padding,
                  y: b.y + this.top - this.padding,
               }),
               c: p,
               padding: this.padding,
            })
         ) {
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
      super.emit("mouseover", s);
   }

   mouseup(s: ShapeEventData): void {
      this.setCoords();
      super.emit("mouseup", s);
   }
}

export default Line;
