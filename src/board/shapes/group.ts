import type { Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import { resizeRect } from "../utils/resize";
import { calcPointWithRotation } from "../utils/utilfunc";
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
    const { width, height, left, top, rotate } = this;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const localBox = new Box({
      x1: -halfW,
      x2: halfW,
      y1: -halfH,
      y2: halfH,
    });
    const d = resizeRect(
      calcPointWithRotation({ height, width, left, point: p, rotate, top }),
      localBox,
      this.padding,
    );
    if (d) {
      return d.rd;
    }

    return null;
  }

  IsDraggable(p: Point): boolean {
    return false;
  }

  draw(options: DrawProps): void {
    const context = this.ctx || options.ctx;

    this.shapes.forEach((s) => {
      s.draw({});
    });
  }
}

export default Group;
