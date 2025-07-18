import { Pointer, Shape } from "../../index";
import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../../types";

type LineProps = {
   points?: Point[];
   lineType?: "" | "";
};

class Line extends Shape {
   declare points: Point[];
   constructor(props: ShapeProps & LineProps) {
      super(props);
      this.type = "line";
      this.points = props.points || [
         { x: this.left, y: this.top },
         { x: this.left + this.width, y: this.top + this.height },
      ];
   }
}

export default Line;
