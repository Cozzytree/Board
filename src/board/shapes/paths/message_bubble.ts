import type { ShapeProps } from "../../types";
import Path from "./path";
import Shape from "../shape";
import Pointer from "../../utils/point";
import type { PathProps } from "./path";

class MessageBubble extends Path {
  constructor(props: ShapeProps & PathProps) {
    super(props);
    this.scaleShape();
  }

  clone(): Shape {
    const props = this.cloneProps();
    return new MessageBubble({ ...props, points: this.points });
  }

  scaleShape(): void {
    const w = this.width;
    const h = this.height;

    // Blocky speech bubble
    // Rectangle with a tail at bottom left-ish

    const tailHeight = h * 0.2;
    const bodyHeight = h - tailHeight;
    const tailWidth = w * 0.15;
    const tailX = w * 0.2;

    const points = [
      new Pointer({ x: 0, y: 0 }), // Top Left
      new Pointer({ x: w, y: 0 }), // Top Right
      new Pointer({ x: w, y: bodyHeight }), // Bottom Right
      new Pointer({ x: tailX + tailWidth, y: bodyHeight }), // Tail Start Right
      new Pointer({ x: tailX, y: h }), // Tail Tip
      new Pointer({ x: tailX, y: bodyHeight }), // Tail Start Left
      new Pointer({ x: 0, y: bodyHeight }), // Bottom Left
    ];

    super.set("points", points);
    this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}

export default MessageBubble;
