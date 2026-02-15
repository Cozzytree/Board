import type { ShapeProps } from "../../types";
import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { PathProps } from "./path";

class Pentagon extends Path {
   constructor(props: ShapeProps & PathProps) {
      super(props);
      this.scaleShape();
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Pentagon({ ...props, points: this.points });
   }

   scaleShape(): void {
      const inset = this.width * 0.15;
      super.set("points", [
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
      ]);
      this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
   }
}

export default Pentagon;
