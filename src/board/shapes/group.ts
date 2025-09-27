import type { Point, resizeDirection, ShapeProps } from "../types";
import Shape, { type DrawProps } from "./shape";

type Props = {
  shapes: Shape[];
};

class Group extends Shape {
  declare shapes: Shape[];
  constructor(props: ShapeProps & Props) {
    super(props);
  }
  clone(): Shape {
    const props = super.cloneProps();
    return new Group({ shapes: this.shapes, ...props });
  }

  IsResizable(p: Point): resizeDirection | null {
    return null;
  }

  IsDraggable(p: Point): boolean {
    return false;
  }

  draw(options: DrawProps): void {
    return;
  }
}

export default Group;
