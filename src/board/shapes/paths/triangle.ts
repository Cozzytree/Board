import { Path, Pointer } from "@/board";
import type { ShapeProps } from "@/board/types";

class Triangle extends Path {
   constructor(props: ShapeProps) {
      super(props);
      this.scaleShape();
   }

   scaleShape(): void {
      this.points = [
         new Pointer({ x: 0 + this.width * 0.5, y: 0 }),
         new Pointer({ x: this.width, y: this.height }),
         new Pointer({ x: 0, y: this.height }),
         new Pointer({ x: this.width * 0.5, y: 0 }),
      ];
   }
}

export default Triangle;
