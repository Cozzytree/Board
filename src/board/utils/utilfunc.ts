import type { Box } from "../index";
import type { Point } from "../types";

function IsIn({ inner, outer }: { inner: Box; outer: Box }): boolean {
   return (
      inner.x1 > outer.x1 &&
      inner.x2 < outer.x2 &&
      inner.y1 > outer.y1 &&
      inner.y2 < outer.y2
   );
}

/**
 * Check if point P is on segment AB within tolerance.
 * @param {{x:number,y:number}} A - segment start
 * @param {{x:number,y:number}} B - segment end
 * @param {{x:number,y:number}} P - point to test
 * @param {number} tol - allowed distance in pixels (e.g. 5)
 * @returns {boolean}
 */
function isPointOnSegment(
   A: Point,
   B: Point,
   P: Point,
   tol: number = 5,
): boolean {
   const vx = B.x - A.x;
   const vy = B.y - A.y;
   const l2 = vx * vx + vy * vy;
   if (l2 === 0) {
      // A and B are the same point
      const dx = P.x - A.x,
         dy = P.y - A.y;
      return dx * dx + dy * dy <= tol * tol;
   }
   // Project P onto AB, compute parameter t
   let t = ((P.x - A.x) * vx + (P.y - A.y) * vy) / l2;
   t = Math.max(0, Math.min(1, t));
   // Find projection coordinates
   const projX = A.x + t * vx;
   const projY = A.y + t * vy;
   // Distance from P to projection
   const dx = P.x - projX;
   const dy = P.y - projY;
   return dx * dx + dy * dy <= tol * tol;
}

function isNearLineSegment(A: Point, B: Point, P: Point, tolerance = 5) {
   const { x: x1, y: y1 } = A;
   const { x: x2, y: y2 } = B;
   const { x: x0, y: y0 } = P;

   const dx = x2 - x1;
   const dy = y2 - y1;
   const len2 = dx * dx + dy * dy; // |AB|²

   if (len2 === 0) {
      // A and B are the same point
      const dist2 = (x0 - x1) ** 2 + (y0 - y1) ** 2;
      return dist2 <= tolerance * tolerance;
   }

   // Projection parameter t = ((P − A) · (B − A)) / |B − A|²
   let t = ((x0 - x1) * dx + (y0 - y1) * dy) / len2;
   t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1

   // Find closest point on segment
   const xc = x1 + t * dx;
   const yc = y1 + t * dy;

   // Distance² from P to that point
   const dist2 = (x0 - xc) ** 2 + (y0 - yc) ** 2;
   return dist2 <= tolerance * tolerance;
}

function isPointNearSegment({
   a,
   b,
   c,
   padding = 5,
}: {
   a: Point;
   b: Point;
   c: Point;
   padding?: number;
}) {
   // Vector from a to b
   const dx = b.x - a.x;
   const dy = b.y - a.y;

   const lenSq = dx * dx + dy * dy;

   // Handle zero-length segment
   if (lenSq === 0) {
      const distSq = (c.x - a.x) ** 2 + (c.y - a.y) ** 2;
      return distSq <= padding * padding;
   }

   // Projection from a to c
   let t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / lenSq;
   t = Math.max(0, Math.min(1, t)); // Clamp to segment

   // Closest point on segment
   const projX = a.x + t * dx;
   const projY = a.y + t * dy;

   // Distance from c to closest point
   const distSq = (c.x - projX) ** 2 + (c.y - projY) ** 2;

   return distSq <= padding * padding;
}

export { IsIn, isNearLineSegment, isPointOnSegment, isPointNearSegment };
