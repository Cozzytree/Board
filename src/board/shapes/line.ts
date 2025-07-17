import { Pointer, Shape } from "../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../types";

type LineProps = {
   points: number[];
};

class Line extends Shape {
   constructor(props: ShapeProps) {
      super(props);
   }

   IsDraggable(p: Pointer): boolean {}

   IsResizable(p: Point): resizeDirection | null {}

   dragging(mousedown: Point, move: Point): void {}

   draw(active: boolean): void {}

   ID(): string {
      return this.id;
   }
   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {}
}

export default Line;
