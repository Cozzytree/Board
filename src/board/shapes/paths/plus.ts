import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { ShapeProps } from "@/board/types";
import type { PathProps } from "./path";

class PlusPath extends Path {
   constructor(props: ShapeProps & PathProps) {
      super(props);
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new PlusPath({ ...props, points: this.points });
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
