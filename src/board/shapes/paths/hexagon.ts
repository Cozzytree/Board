import type { ShapeProps } from "../../types";
import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { PathProps } from "./path";

class Hexagon extends Path {
  constructor(props: ShapeProps & PathProps) {
    super(props);
    this.scaleShape();
  }

  clone(): Shape {
    const props = this.cloneProps();
    return new Hexagon({ ...props, points: this.points });
  }

  scaleShape(): void {
    const w = this.width;
    const h = this.height;

    // Flat topped hexagon? Or Pointy topped?
    // Let's do Pointy topped to fit typical generic use, or Flat topped to fit wide bounds?
    // Usually "Hexagon" icon implies pointy sides (left/right).
    // Let's do the one that matches width/height box well.
    // Pointy sides (left/right) is common for flowcharts.

    // Pointy left/right
    const points = [
      new Pointer({ x: w * 0.25, y: 0 }), // Top Left
      new Pointer({ x: w * 0.75, y: 0 }), // Top Right
      new Pointer({ x: w, y: h / 2 }), // Right Point
      new Pointer({ x: w * 0.75, y: h }), // Bottom Right
      new Pointer({ x: w * 0.25, y: h }), // Bottom Left
      new Pointer({ x: 0, y: h / 2 }), // Left Point
    ];

    super.set("points", points);
    this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}

export default Hexagon;
