import { Path } from "../../index";
import { Pointer } from "../../index";

class CloudShape extends Path {
  constructor(props: any) {
    super(props);
    const w = props.width || 100;
    const h = props.height || 100;

    // a simple cloud-like path or just a distinct shape
    // Let's make a "Cloud" or just a complex polygon to test
    this.points = [
      new Pointer({ x: w * 0.2, y: h * 0.8 }),
      new Pointer({ x: w * 0.1, y: h * 0.6 }),
      new Pointer({ x: w * 0.2, y: h * 0.4 }),
      new Pointer({ x: w * 0.4, y: h * 0.3 }),
      new Pointer({ x: w * 0.6, y: h * 0.2 }),
      new Pointer({ x: w * 0.8, y: h * 0.4 }),
      new Pointer({ x: w * 0.9, y: h * 0.6 }),
      new Pointer({ x: w * 0.8, y: h * 0.8 }),
      new Pointer({ x: w * 0.5, y: h * 0.9 }),
      new Pointer({ x: w * 0.2, y: h * 0.8 }),
    ];

    // Ensure we initialize lastPoints for the resize fix!
    this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
  }
}

export default CloudShape;
