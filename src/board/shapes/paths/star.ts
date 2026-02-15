import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { ShapeProps } from "../../types";
import type { PathProps } from "./path";

class Star extends Path {
  constructor(props: ShapeProps & PathProps) {
    super(props);
    this.scaleShape();
  }

  clone(): Shape {
    const props = this.cloneProps();
    return new Star({ ...props, points: this.points });
  }

  scaleShape(): void {
    const w = this.width;
    const h = this.height;

    // 5 points star
    // We'll define standard points for a star
    // Top point is at (w/2, 0)

    const points = [
      new Pointer({ x: w * 0.5, y: 0 }), // Top
      new Pointer({ x: w * 0.618, y: h * 0.382 }), // Inner Right Upper
      new Pointer({ x: w, y: h * 0.382 }), // Right Upper Arm
      new Pointer({ x: w * 0.691, y: h * 0.618 }), // Inner Right Lower
      new Pointer({ x: w * 0.809, y: h }), // Right Lower Leg
      new Pointer({ x: w * 0.5, y: h * 0.764 }), // Bottom Inner
      new Pointer({ x: w * 0.191, y: h }), // Left Lower Leg
      new Pointer({ x: w * 0.309, y: h * 0.618 }), // Inner Left Lower
      new Pointer({ x: 0, y: h * 0.382 }), // Left Upper Arm
      new Pointer({ x: w * 0.382, y: h * 0.382 }) // Inner Left Upper
    ];

    super.set("points", points);
    this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}

export default Star;
