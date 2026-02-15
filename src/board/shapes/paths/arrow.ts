import type { ShapeProps } from "../../types";
import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { PathProps } from "./path";

class Arrow extends Path {
  constructor(props: ShapeProps & PathProps) {
    super(props);
    this.scaleShape();
  }

  clone(): Shape {
    const props = this.cloneProps();
    return new Arrow({ ...props, points: this.points });
  }

  scaleShape(): void {
    const w = this.width;
    const h = this.height;

    // Right pointing arrow
    const headWidth = w * 0.4;
    const shaftHeight = h * 0.5;
    const shaftY = (h - shaftHeight) / 2; // centered vertically

    const points = [
      new Pointer({ x: 0, y: shaftY }), // Shaft Top Left
      new Pointer({ x: w - headWidth, y: shaftY }), // Shaft Top Right
      new Pointer({ x: w - headWidth, y: 0 }), // Head Top
      new Pointer({ x: w, y: h / 2 }), // Point
      new Pointer({ x: w - headWidth, y: h }), // Head Bottom
      new Pointer({ x: w - headWidth, y: shaftY + shaftHeight }), // Shaft Bottom Right
      new Pointer({ x: 0, y: shaftY + shaftHeight }), // Shaft Bottom Left
    ];

    super.set("points", points);
    this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}

export default Arrow;
