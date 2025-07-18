import { Pointer, Shape } from "../../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../../types";
import type { DrawProps } from "../shape";

type LineType = "curve" | "straight";

type LineProps = {
   points?: Point[];
   lineType?: LineType;
};

class Line extends Shape {
   declare points: Point[];
   declare lineType: LineType;
   declare startShape: { s: Shape; xper: number; yper: number } | null;
   declare endShape: { s: Shape; xper: number; yper: number } | null;

   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.type = "line";
      this.points = props.points || [
         { x: this.left, y: this.top },
         { x: this.left + this.width, y: this.top + this.height },
      ];
      this.lineType = props.lineType || "straight";
   }

   IsResizable(p: Point): resizeDirection | null {}

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {}

   draw(options: DrawProps): void {}
}

export default Line;
