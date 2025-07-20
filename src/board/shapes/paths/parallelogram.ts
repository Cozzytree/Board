import { Path, Pointer } from "@/board/index";
import type { ShapeProps } from "@/board/types";

class Parallelogram extends Path {
   constructor(props: ShapeProps) {
      super(props);
   }

   scaleShape(): void {
      const inset = this.width * 0.25;
      this.points = [
         new Pointer({ x: this.flipY ? 0 : inset, y: 0 }),
         new Pointer({ x: this.flipY ? this.width - inset : this.width, y: 0 }),
         new Pointer({
            x: this.flipY ? this.width : this.width - inset,
            y: this.height,
         }),
         new Pointer({ x: this.flipY ? inset : 0, y: this.height }),
      ];
   }
}

export default Parallelogram;
