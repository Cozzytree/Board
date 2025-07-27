import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { connectionEventData, LineProps, LineType } from "../shape_types";
import { intersectLineWithBox, isPointNearSegment, setCoords } from "@/board/utils/utilfunc";
import { AnchorLine, Pointer, Shape } from "@/board/index";

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
      this.textAlign = "center";
      this.verticalAlign = "center";
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

   protected renderArrow({
      ctx,
      arrowLength,
      endPoint,
      startPoint,
   }: {
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      arrowLength: number;
      ctx: CanvasRenderingContext2D;
   }) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.beginPath();

      // Draw the arrowhead
      const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

      // First side of the arrowhead
      ctx.moveTo(endPoint.x, endPoint.y);
      ctx.lineTo(
         endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
         endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6),
      );
      ctx.stroke();
      ctx.closePath();

      // Second side of the arrowhead
      ctx.beginPath();
      ctx.moveTo(endPoint.x, endPoint.y);
      ctx.lineTo(
         endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
         endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6),
      );
      ctx.stroke();
      ctx.closePath();
   }

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

      if (
         this.resizeIndex === null ||
         this.resizeIndex < 0 ||
         this.resizeIndex > this.points.length - 1
      )
         return;

      const foundShape = this._board.shapeStore.forEach((shape) => {
         if (shape.IsDraggable(s.e.point) && shape.type !== "line" && shape.ID() != this.ID()) {
            return true;
         }
         return false;
      });

      if (!foundShape) {
         this.connections.clear(this.resizeIndex === 0 ? "s" : "e", this.ID());
         return;
      }

      const coords = {
         x: ((s.e.point.x - foundShape.left) / foundShape.width) * 100,
         y: ((s.e.point.y - foundShape.top) / foundShape.height) * 100,
      };

      if (this.resizeIndex == 0) {
         this.connections.clear("s", this.ID());
         // check if already connected to end
         const alreadyConnected = this.connections.forEach((connect) => {
            if (connect.s.ID() === foundShape.ID() && connect.connected === "e") return true;
            return false;
         });

         if (alreadyConnected !== null) return;

         this.connections.add({ s: foundShape, coords, connected: "s" });
         foundShape.connections.add({ s: this, coords, connected: "s" });
      } else {
         this.connections.clear("e", this.ID());
         // check if already connected to start
         const alreadyConnected = this.connections.forEach((connect) => {
            if (connect.s.ID() === foundShape.ID() && connect.connected === "s") return true;
            return false;
         });

         if (alreadyConnected !== null) return;

         this.connections.add({ s: foundShape, coords, connected: "e" });
         foundShape.connections.add({ s: this, coords, connected: "e" });
      }
      this.resizeIndex = null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      const index = d === "br" ? this.points.length - 1 : this.resizeIndex;
      if (index === null || index < 0 || index > this.points.length - 1) return;

      if (this.resizeIndex == null) {
         this.resizeIndex = index;
      }

      const foundShape = this._board.shapeStore.forEach((s) => {
         if (s.IsDraggable(current) && s.ID() !== this.ID() && s.type !== "line") {
            return true;
         }
         return false;
      });

      if (foundShape) {
         let oppositeP = index;
         if (index === 0) {
            oppositeP = 1;
         } else {
            oppositeP = this.points.length - 2;
         }

         const i = intersectLineWithBox(
            current.x,
            current.y,
            this.left + this.points[oppositeP].x,
            this.top + this.points[oppositeP].y,
            foundShape.left,
            foundShape.left + foundShape.width,
            foundShape.top,
            foundShape.top + foundShape.height,
         );
         if (i.length) {
            const intersectPoint = new Pointer({ x: i[0][0], y: i[0][1] });

            // Convert intersection point to relative coordinates within this box
            const relativeX = intersectPoint.x - this.left;
            const relativeY = intersectPoint.y - this.top;

            this.points[index] = new Pointer({ x: relativeX, y: relativeY });
         }
      } else {
         this.points[index] = { x: current.x - this.left, y: current.y - this.top };
      }
   }

   connectionEvent({ c, s, p }: connectionEventData): void {
      const absPoint = {
         x: s.left + (c.coords.x / 100) * s.width,
         y: s.top + (c.coords.y / 100) * s.height,
      };

      let index = 0;
      if (c.connected === "s") {
         index = this.points.length - 1;
      }

      const intersect = intersectLineWithBox(
         this.left + this.points[index].x,
         this.top + this.points[index].y,
         absPoint.x,
         absPoint.y,
         s.left,
         s.left + s.width,
         s.top,
         s.top + s.height,
      );

      if (intersect.length) {
         const relativeX = intersect[0][0] - this.left;
         const relativeY = intersect[0][1] - this.top;
         if (c.connected == "s") {
            this.points[0] = { x: relativeX, y: relativeY };
         } else {
            this.points[this.points.length - 1] = { x: relativeX, y: relativeY };
         }

         if (this instanceof AnchorLine) {
            this.Resize(p, { x1: 0, y1: 0, y2: 0, x2: 0 }, "b");
         }
      }
   }
}

export default Line;
