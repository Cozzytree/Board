import type { BoxInterface } from "../types";

class Box implements BoxInterface {
   x1: number;
   x2: number;
   y1: number;
   y2: number;

   constructor(props: BoxInterface) {
      this.x1 = props.x1 || 0;
      this.x2 = props.x2 || 0;
      this.y1 = props.y1 || 0;
      this.y2 = props.y2 || 0;
   }

   /*
    */
   fullyContains(other: Box): boolean {
      return (
         other.x1 >= this.x1 && other.x2 <= this.x2 && other.y1 >= this.y1 && other.y2 <= this.y2
      );
   }

   isInOther(other: Box): boolean {
      return other.x1 > this.x1 && other.x2 < this.x2 && other.y1 > this.y1 && other.y2 < this.y2;
   }

   containsPoint(x: number, y: number): boolean {
      return x >= this.x1 && x <= this.x2 && y >= this.y1 && y <= this.y2;
   }

   isInOtherPartial(other: Box): boolean {
      const corners = [
         { x: other.x1, y: other.y1 }, // top-left
         { x: other.x2, y: other.y1 }, // top-right
         { x: other.x1, y: other.y2 }, // bottom-left
         { x: other.x2, y: other.y2 }, // bottom-right
      ];

      return corners.some(({ x, y }) => this.containsPoint(x, y));
   }

   compareAndReturnBig(box2: Box): Box {
      const newBox = new Box({ x1: 0, y1: 0, x2: 0, y2: 0 });
      newBox.x1 = Math.min(this.x1, box2.x1);
      newBox.x2 = Math.max(this.x2, box2.x2);
      newBox.y1 = Math.min(this.y1, box2.y1);
      newBox.y2 = Math.max(this.y2, box2.y2);

      return newBox;
   }

   compareAndReturnSmall(box2: Box): Box {
      const newBox = new Box({ x1: 0, y1: 0, x2: 0, y2: 0 });
      newBox.x1 = Math.min(this.x1, box2.x1);
      newBox.x2 = Math.max(this.x2, box2.x2);
      newBox.y1 = Math.min(this.y1, box2.y1);
      newBox.y2 = Math.max(this.y2, box2.y2);

      return newBox;
   }
}

export default Box;
