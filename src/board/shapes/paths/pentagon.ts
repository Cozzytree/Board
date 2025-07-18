import type {
   BoxInterface,
   Point,
   resizeDirection,
   ShapeProps,
} from "../../types";
import { Path, Pointer } from "../../index";
import type { PathProps } from "./path";

class Pentagon extends Path {
   constructor(props: ShapeProps & PathProps) {
      super(props);

      this.scaleShape();
   }

   scaleShape(): void {
      const inset = this.width * 0.15;
      this.points = [
         new Pointer({ x: 0, y: this.height * 0.45 }), // P0 - top-left
         new Pointer({
            x: this.width / 2,
            y: 0,
         }), // P1 - top-center
         new Pointer({
            x: this.width,
            y: this.height * 0.45,
         }), // P2 - top-right
         new Pointer({
            x: this.width - inset,
            y: this.height,
         }), // P3 - bottom-right (inward from P2)
         new Pointer({
            x: inset,
            y: this.height,
         }), // P4 - bottom-left (inward from P0)
      ];
   }
}

export default Pentagon;
