import type { Point } from "../types";

export default class Pointer implements Point {
   x: number;
   y: number;
   constructor(p: { x: number; y: number }) {
      this.x = p.x;
      this.y = p.y;
   }
}
