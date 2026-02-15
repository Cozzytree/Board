import Path from "./path";
import Pointer from "../../utils/point";
import type { ShapeProps } from "@/board/types";
import type { PathProps } from "./path";

class Triangle extends Path {
   constructor(props: ShapeProps & PathProps) {
      super(props);
   }

   scaleShape(): void {
      super.set("points", [
         new Pointer({ x: 0 + this.width * 0.5, y: 0 }),
         new Pointer({ x: this.width, y: this.height }),
         new Pointer({ x: 0, y: this.height }),
         new Pointer({ x: this.width * 0.5, y: 0 }),
      ]);
      this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
   }
}

export default Triangle;
