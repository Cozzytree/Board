import { Path, Pointer } from "@/board/index";
import type { ShapeProps } from "@/board/types";

class PlusPath extends Path {
   constructor(props: ShapeProps) {
      super(props);
   }

   scaleShape(): void {
      const halfX = this.width / 2;
      const halfY = this.height / 2;
      const gapX = halfX * 0.25;
      const gapY = halfY * 0.25;
      this.points = [
         new Pointer({ x: halfX - gapX, y: 0 }),
         new Pointer({ x: halfX + gapX, y: 0 }),
         new Pointer({ x: halfX + gapX, y: halfY - gapY }),
         new Pointer({ x: this.width, y: halfY - gapY }),
         new Pointer({ x: this.width, y: halfY + gapY }),
         new Pointer({ x: halfX + gapX, y: halfY + gapY }),
         new Pointer({ x: halfX + gapX, y: this.height }),
         new Pointer({ x: halfX - gapX, y: this.height }),
         new Pointer({ x: halfX - gapX, y: halfY + gapY }),
         new Pointer({ x: 0, y: halfY + gapY }),
         new Pointer({ x: 0, y: halfY - gapY }),
         new Pointer({ x: halfX - gapX, y: halfY - gapY }),
      ];
   }
}

export default PlusPath;
