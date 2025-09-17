import { SnapeLineColor } from "../constants";
import {
   ActiveSelection,
   Board,
   Rect,
   Box,
   Pointer,
   Shape,
   SimplePath,
   Ellipse,
   Text,
   Path,
} from "../index";
import type { ActiveSeletionProps } from "../shapes/active_selection";
import type { PathProps } from "../shapes/paths/path";
import type { ActiveSelectionShape } from "../shapes/shape_types";
import type { BoxInterface, Identity, Point, resizeDirection } from "../types";

function IsIn({ inner, outer }: { inner: Box; outer: Box }): boolean {
   return inner.x1 > outer.x1 && inner.x2 < outer.x2 && inner.y1 > outer.y1 && inner.y2 < outer.y2;
}

/**
 * Check if point P is on segment AB within tolerance.
 * @param {{x:number,y:number}} A - segment start
 * @param {{x:number,y:number}} B - segment end
 * @param {{x:number,y:number}} P - point to test
 * @param {number} tol - allowed distance in pixels (e.g. 5)
 * @returns {boolean}
 */
function isPointOnSegment(A: Point, B: Point, P: Point, tol: number = 5): boolean {
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

function generateShapeByShapeType(
   val: Identity<Shape & ActiveSeletionProps & PathProps>,
   board: Board,
   ctx: CanvasRenderingContext2D,
): Shape | null {
   if (!val) return null;
   if (val.type === "rect") {
      return new Rect({
         ...val,
         _board: board,
         ctx,
      });
   } else if (val.type === "selection") {
      if (!val.shapes || val.shapes.length == 0) return null;
      const shapes: ActiveSelectionShape[] = [];
      val.shapes.forEach((s: Identity<Shape>) => {
         const newS = generateShapeByShapeType(s, board, ctx);
         if (!newS) return;
         shapes.push({
            s: newS,
            offset: new Pointer({
               x: newS.left - val.left,
               y: newS.top - val.top,
            }),
         });
      });

      if (!shapes.length) return null;

      return new ActiveSelection({
         shapes: shapes,
         _board: board,
         ctx: ctx,
         width: val.width,
         height: val.height,
         left: val.left,
         top: val.top,
      });
   } else if (val.type === "path") {
      if (val.pathType === "simplePath") {
         return new SimplePath({
            ...val,
            ctx,
            _board: board,
         });
      }
   } else if (val.type === "ellipse") {
      return new Ellipse({
         ...val,
         _board: board,
         ctx: ctx,
      });
   } else if (val.type === "line") {
      //
   } else if (val.type === "text") {
      return new Text({
         ...val,
         _board: board,
         ctx: ctx,
      });
   }

   return null;
}

function flipXandYByDirection(
   current: Point,
   fixedX: number,
   fixedY: number,
   wasFlippedX: boolean,
   wasFlippedY: boolean,
   d: resizeDirection,
   old: BoxInterface,
): { flipX: boolean; flipY: boolean } {
   let flipX: boolean = wasFlippedX;
   let flipY: boolean = wasFlippedY;
   if (d === "br") {
      flipX = wasFlippedX ? current.x > fixedX : current.x < fixedX;
      flipY = wasFlippedY ? current.y > fixedY : current.y < fixedY;
   } else if (d === "tl") {
      fixedX = old.x2;
      fixedY = old.y2;
      flipX = wasFlippedX ? current.x < fixedX : current.x > fixedX;
      flipY = wasFlippedY ? current.y < fixedY : current.y > fixedY;
   } else if (d === "tr") {
      fixedX = old.x1;
      fixedY = old.y2;
      flipX = wasFlippedX ? current.x > fixedX : current.x < fixedX;
      flipY = wasFlippedY ? current.y < fixedY : current.y > fixedY;
   } else if (d === "bl") {
      fixedX = old.x2;
      fixedY = old.y1;
      flipX = wasFlippedX ? current.x < fixedX : current.x > fixedX;
      flipY = wasFlippedY ? current.y > fixedY : current.y < fixedY;
   }

   return { flipX, flipY };
   // return wasFlipped ? current > fixed : current < fixed;
}

function setCoords(points: Point[], left: number, top: number): { box: Box; points: Point[] } {
   let minX = Infinity;
   let minY = Infinity;
   let maxX = -Infinity;
   let maxY = -Infinity;

   // Step 1: Find absolute bounding box
   points.forEach((p) => {
      const absoluteX = left + p.x;
      const absoluteY = top + p.y;

      minX = Math.min(absoluteX, minX);
      minY = Math.min(absoluteY, minY);
      maxX = Math.max(absoluteX, maxX);
      maxY = Math.max(absoluteY, maxY);
   });

   const newLeft = minX;
   const newTop = minY;
   const newWidth = maxX - minX;
   const newHeight = maxY - minY;

   // Step 2: Adjust points to new bounding box (make them relative to newLeft/newTop)
   const newPoints = points.map((p) => ({
      x: left + p.x - newLeft,
      y: top + p.y - newTop,
   }));

   // Step 3: Set the new bounding box and points
   return {
      box: new Box({
         x1: newLeft,
         y1: newTop,
         x2: newLeft + newWidth,
         y2: newTop + newHeight,
      }),
      points: newPoints,
   };
}

const intersectLineWithBox = (
   x1: number,
   y1: number,
   x2: number,
   y2: number,
   xmin: number,
   xmax: number,
   ymin: number,
   ymax: number,
) => {
   const intersections = [];

   // Calculate direction of the line
   const dx = x2 - x1;
   const dy = y2 - y1;

   // Check for intersection with the left vertical edge (x = xmin)
   if (dx !== 0) {
      const tLeft = (xmin - x1) / dx;
      if (tLeft >= 0 && tLeft <= 1) {
         const yIntersection = y1 + tLeft * dy;
         if (yIntersection >= ymin && yIntersection <= ymax) {
            intersections.push([xmin, yIntersection]);
         }
      }
   }

   // Check for intersection with the right vertical edge (x = xmax)
   if (dx !== 0) {
      const tRight = (xmax - x1) / dx;
      if (tRight >= 0 && tRight <= 1) {
         const yIntersection = y1 + tRight * dy;
         if (yIntersection >= ymin && yIntersection <= ymax) {
            intersections.push([xmax, yIntersection]);
         }
      }
   }

   // Check for intersection with the bottom horizontal edge (y = ymin)
   if (dy !== 0) {
      const tBottom = (ymin - y1) / dy;
      if (tBottom >= 0 && tBottom <= 1) {
         const xIntersection = x1 + tBottom * dx;
         if (xIntersection >= xmin && xIntersection <= xmax) {
            intersections.push([xIntersection, ymin]);
         }
      }
   }

   // Check for intersection with the top horizontal edge (y = ymax)
   if (dy !== 0) {
      const tTop = (ymax - y1) / dy;
      if (tTop >= 0 && tTop <= 1) {
         const xIntersection = x1 + tTop * dx;
         if (xIntersection >= xmin && xIntersection <= xmax) {
            intersections.push([xIntersection, ymax]);
         }
      }
   }

   return intersections;
};

function breakText({
   width,
   text,
   ctx,
}: {
   ctx: CanvasRenderingContext2D;
   width: number;
   text: string;
}) {
   const maxWidth = width * 0.48;
   // const lineHeight = this.fontSize * 1.2;
   const paragraphs = text.split("\n");
   const lines: string[] = [];

   const breakLongWord = (word: string): string[] => {
      const broken: string[] = [];
      let current = "";

      for (const char of word) {
         const test = current + char;
         if (ctx.measureText(test).width > maxWidth) {
            if (current) broken.push(current);
            current = char;
         } else {
            current += char;
         }
      }

      if (current) broken.push(current);
      return broken;
   };

   for (const paragraph of paragraphs) {
      if (paragraph.trim() === "") {
         lines.push(""); // Preserve empty lines
         continue;
      }

      const words = paragraph.split(" ");
      let line = "";

      for (const word of words) {
         const testLine = line ? line + " " + word : word;
         const testWidth = ctx.measureText(testLine).width;

         if (testWidth <= maxWidth) {
            line = testLine;
         } else {
            if (line) {
               lines.push(line);
            }

            // Now handle word — break if it's too long
            if (ctx.measureText(word).width > maxWidth) {
               const brokenWords = breakLongWord(word);
               for (let i = 0; i < brokenWords.length - 1; i++) {
                  lines.push(brokenWords[i]);
               }
               line = brokenWords[brokenWords.length - 1]; // Start next line with remainder
            } else {
               line = word;
            }
         }
      }

      if (line) lines.push(line);
   }

   return lines;
}

function calcPointWithRotation({
   left,
   top,
   width,
   height,
   point,
   rotate,
}: {
   point: Point;
   left: number;
   top: number;
   width: number;
   height: number;
   rotate: number;
}) {
   const centerX = left + width / 2;
   const centerY = top + height / 2;

   const dx = point.x - centerX;
   const dy = point.y - centerY;

   const cos = Math.cos(-rotate);
   const sin = Math.sin(-rotate);

   const localX = dx * cos - dy * sin;
   const localY = dx * sin + dy * cos;

   return new Pointer({ x: localX, y: localY });
}

type rect = { left: number; top: number; right: number; bottom: number };
type Side = "left" | "right" | "top" | "bottom";

// @ts-ignore
function center(r: rect): Point {
   return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
}

function anchor(r: rect, side: Side): Point {
   switch (side) {
      case "left":
         return { x: r.left, y: (r.top + r.bottom) / 2 };
      case "right":
         return { x: r.right, y: (r.top + r.bottom) / 2 };
      case "top":
         return { x: (r.left + r.right) / 2, y: r.top };
      case "bottom":
         return { x: (r.left + r.right) / 2, y: r.bottom };
   }
}

// @ts-ignore
function intersectsX(r: rect, x: number, margin: number) {
   return x >= r.left - margin && x <= r.right + margin;
}

// @ts-ignore
function intersectsY(r: rect, y: number, margin: number) {
   return y >= r.top - margin && y <= r.bottom + margin;
}

function manhattanLength(path: Point[]): number {
   let sum = 0;
   for (let i = 0; i < path.length - 1; i++)
      sum += Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
   return sum;
}

function intersectsBox(p1: Point, p2: Point, box: Box): boolean {
   const minX = Math.min(p1.x, p2.x);
   const maxX = Math.max(p1.x, p2.x);
   const minY = Math.min(p1.y, p2.y);
   const maxY = Math.max(p1.y, p2.y);

   return !(maxX < box.x1 || minX > box.x1 + box.x2 || maxY < box.y1 || minY > box.y1 + box.y2);
}

function pathIsValid(path: Point[], obstacles: rect[]): boolean {
   for (let i = 0; i < path.length - 1; i++) {
      for (const r of obstacles) {
         if (segmentHitsBox(path[i], path[i + 1], r)) return false;
      }
   }
   return true;
}

function getAnchor(box: Box, side: "left" | "right" | "top" | "bottom"): Point {
   switch (side) {
      case "left":
         return { x: box.x1, y: box.y1 + box.y2 / 2 };
      case "right":
         return { x: box.x1 + box.x2, y: box.y1 + box.y2 / 2 };
      case "top":
         return { x: box.x1 + box.x2 / 2, y: box.y1 };
      case "bottom":
         return { x: box.x1 + box.x2 / 2, y: box.y1 + box.y2 };
   }
}

function pickSafeAnchor(
   box: Box,
   preferred: "left" | "right" | "top" | "bottom",
   otherBox: Box,
): Point {
   const order = [preferred, "top", "bottom", "left", "right"]; // fallback order
   for (const side of order) {
      const anchor = getAnchor(box, side as any);
      if (!intersectsBox(anchor, getAnchor(otherBox, preferred), otherBox)) {
         return anchor;
      }
   }
   return getAnchor(box, preferred); // fallback to original
}

function routeOrthogonalDynamic(
   boxA: Box,
   boxB: Box,
   sideA: "left" | "right" | "top" | "bottom",
   sideB: "left" | "right" | "top" | "bottom",
): Point[] {
   const anchorA = pickSafeAnchor(boxA, sideA, boxB);
   const anchorB = pickSafeAnchor(boxB, sideB, boxA);

   const points: Point[] = [anchorA];

   // simple L/Z routing with midpoints
   if (anchorA.x === anchorB.x || anchorA.y === anchorB.y) {
      points.push(anchorB);
      return points;
   }

   // Try Z-shape
   const midX = (anchorA.x + anchorB.x) / 2;
   points.push({ x: midX, y: anchorA.y });
   points.push({ x: midX, y: anchorB.y });
   points.push(anchorB);

   return points;
}

// function routeOrthogonal(boxA: Box, boxB: Box): Point[] {
//    const anchorA = { x: boxA.x1 + boxA.x2, y: boxA.y1 + boxA.y2 / 2 }; // right side
//    const anchorB = { x: boxB.x1, y: boxB.y1 + boxB.y2 / 2 }; // left side

//    const points: Point[] = [anchorA];

//    // Case 1: anchorA and anchorB horizontally aligned
//    if (anchorA.y === anchorB.y) {
//       points.push(anchorB);
//       return points;
//    }

//    // Case 2: Simple Z shape
//    const midX = (anchorA.x + anchorB.x) / 2;
//    points.push({ x: midX, y: anchorA.y });
//    points.push({ x: midX, y: anchorB.y });
//    points.push(anchorB);

//    return points;
// }

// function routeOrthogonal(a: rect, b: rect, margin = 8): Point[] {
//    console.log(a, b);
//    const ca = center(a);
//    const cb = center(b);

//    // Decide orientation + facing sides
//    const horizGap = a.right + margin <= b.left - margin || b.right + margin <= a.left - margin;
//    const vertGap = a.bottom + margin <= b.top - margin || b.bottom + margin <= a.top - margin;

//    let aSide: "left" | "right" | "top" | "bottom";
//    let bSide: "left" | "right" | "top" | "bottom";
//    let orientation: "h" | "v";

//    if (horizGap) {
//       orientation = "h";
//       if (ca.x <= cb.x) {
//          aSide = "right";
//          bSide = "left";
//       } else {
//          aSide = "left";
//          bSide = "right";
//       }
//    } else if (vertGap) {
//       orientation = "v";
//       if (ca.y <= cb.y) {
//          aSide = "bottom";
//          bSide = "top";
//       } else {
//          aSide = "top";
//          bSide = "bottom";
//       }
//    } else {
//       // Overlap in projections: choose the shorter of horizontal vs vertical approach
//       const dx = Math.abs(ca.x - cb.x);
//       const dy = Math.abs(ca.y - cb.y);
//       if (dx >= dy) {
//          orientation = "h";
//          if (ca.x <= cb.x) {
//             aSide = "right";
//             bSide = "left";
//          } else {
//             aSide = "left";
//             bSide = "right";
//          }
//       } else {
//          orientation = "v";
//          if (ca.y <= cb.y) {
//             aSide = "bottom";
//             bSide = "top";
//          } else {
//             aSide = "top";
//             bSide = "bottom";
//          }
//       }
//    }

//    const A = anchor(a, aSide);
//    const B = anchor(b, bSide);

//    // Dock out of each box by margin so we’re clear
//    const Aout: Point = { ...A };
//    const Bin: Point = { ...B };
//    if (aSide === "right") Aout.x += margin;
//    if (aSide === "left") Aout.x -= margin;
//    if (aSide === "top") Aout.y -= margin;
//    if (aSide === "bottom") Aout.y += margin;

//    if (bSide === "right") Bin.x += margin;
//    if (bSide === "left") Bin.x -= margin;
//    if (bSide === "top") Bin.y -= margin;
//    if (bSide === "bottom") Bin.y += margin;

//    const pts: Point[] = [A, Aout];

//    if (orientation === "h") {
//       // Try a mid X that’s outside both boxes
//       let midX = (Aout.x + Bin.x) / 2;
//       if (intersectsX(a, midX, margin) || intersectsX(b, midX, margin)) {
//          const laneLeft = Math.min(a.left, b.left) - margin;
//          const laneRight = Math.max(a.right, b.right) + margin;
//          // choose shorter lane
//          const costLeft = Math.abs(Aout.x - laneLeft) + Math.abs(Bin.x - laneLeft);
//          const costRight = Math.abs(Aout.x - laneRight) + Math.abs(Bin.x - laneRight);
//          midX = costLeft <= costRight ? laneLeft : laneRight;
//       }
//       pts.push({ x: midX, y: Aout.y });
//       pts.push({ x: midX, y: Bin.y });
//       pts.push(Bin);
//       pts.push(B);
//    } else {
//       // 'v'
//       let midY = (Aout.y + Bin.y) / 2;
//       if (intersectsY(a, midY, margin) || intersectsY(b, midY, margin)) {
//          const laneUp = Math.min(a.top, b.top) - margin;
//          const laneDown = Math.max(a.bottom, b.bottom) + margin;
//          const costUp = Math.abs(Aout.y - laneUp) + Math.abs(Bin.y - laneUp);
//          const costDown = Math.abs(Aout.y - laneDown) + Math.abs(Bin.y - laneDown);
//          midY = costUp <= costDown ? laneUp : laneDown;
//       }
//       pts.push({ x: Aout.x, y: midY });
//       pts.push({ x: Bin.x, y: midY });
//       pts.push(Bin);
//       pts.push(B);
//    }

//    // de-duplicate consecutive points
//    const out: Point[] = [];
//    for (const p of pts) {
//       const last = out[out.length - 1];
//       if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
//    }
//    return out;
// }

// function routeOrthogonal(a: rect, b: rect, margin = 8, aSide?: Side, bSide?: Side): Point[] {
//    // ✅ If sides are given, use them. Otherwise, pick automatically.
//    const autoPickSides = !aSide || !bSide;

//    if (autoPickSides) {
//       // Pick automatically based on relative position
//       const ca = { x: (a.left + a.right) / 2, y: (a.top + a.bottom) / 2 };
//       const cb = { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
//       const dx = Math.abs(ca.x - cb.x);
//       const dy = Math.abs(ca.y - cb.y);

//       if (dx >= dy) {
//          aSide = ca.x <= cb.x ? "right" : "left";
//          bSide = ca.x <= cb.x ? "left" : "right";
//       } else {
//          aSide = ca.y <= cb.y ? "bottom" : "top";
//          bSide = ca.y <= cb.y ? "top" : "bottom";
//       }
//    }

//    const A = anchor(a, aSide!);
//    const B = anchor(b, bSide!);

//    // Dock out of each box by margin
//    const Aout: Point = { ...A };
//    const Bin: Point = { ...B };
//    if (aSide === "right") Aout.x += margin;
//    if (aSide === "left") Aout.x -= margin;
//    if (aSide === "top") Aout.y -= margin;
//    if (aSide === "bottom") Aout.y += margin;

//    if (bSide === "right") Bin.x += margin;
//    if (bSide === "left") Bin.x -= margin;
//    if (bSide === "top") Bin.y -= margin;
//    if (bSide === "bottom") Bin.y += margin;

//    const pts: Point[] = [A, Aout];

//    // Determine orientation
//    if (aSide === "left" || aSide === "right") {
//       // Horizontal routing
//       let midX = (Aout.x + Bin.x) / 2;
//       if (intersectsX(a, midX, margin) || intersectsX(b, midX, margin)) {
//          midX = Math.max(a.right, b.right) + margin; // pick a safe lane
//       }
//       pts.push({ x: midX, y: Aout.y });
//       pts.push({ x: midX, y: Bin.y });
//    } else {
//       // Vertical routing
//       let midY = (Aout.y + Bin.y) / 2;
//       if (intersectsY(a, midY, margin) || intersectsY(b, midY, margin)) {
//          midY = Math.max(a.bottom, b.bottom) + margin; // pick a safe lane
//       }
//       pts.push({ x: Aout.x, y: midY });
//       pts.push({ x: Bin.x, y: midY });
//    }

//    pts.push(Bin, B);

//    // Deduplicate
//    const out: Point[] = [];
//    for (const p of pts) {
//       const last = out[out.length - 1];
//       if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
//    }
//    return out;
// }

// helper: does a straight horizontal/vertical segment cross a rect?
// function segmentHitsBox(a: Point, b: Point, r: rect): boolean {
//    if (a.x === b.x) {
//       const x = a.x;
//       const y1 = Math.min(a.y, b.y),
//          y2 = Math.max(a.y, b.y);
//       return x >= r.left && x <= r.right && y1 < r.bottom && y2 > r.top;
//    }
//    if (a.y === b.y) {
//       const y = a.y;
//       const x1 = Math.min(a.x, b.x),
//          x2 = Math.max(a.x, b.x);
//       return y >= r.top && y <= r.bottom && x1 < r.right && x2 > r.left;
//    }
//    return false;
// }
function segmentHitsBox(a: Point, b: Point, r: rect): boolean {
   if (a.x === b.x) {
      // vertical
      const y1 = Math.min(a.y, b.y),
         y2 = Math.max(a.y, b.y);
      return a.x >= r.left && a.x <= r.right && y1 < r.bottom && y2 > r.top;
   }
   if (a.y === b.y) {
      // horizontal
      const x1 = Math.min(a.x, b.x),
         x2 = Math.max(a.x, b.x);
      return a.y >= r.top && a.y <= r.bottom && x1 < r.right && x2 > r.left;
   }
   return false;
}

function routeOrthogonal(
   a: rect,
   b: rect,
   margin = 12,
   aSide: Side = "right",
   bSide: Side = "left",
): Point[] {
   const A = anchor(a, aSide);
   const B = anchor(b, bSide);

   // Step out of each box by margin
   const Aout = { ...A };
   const Bout = { ...B };
   if (aSide === "right") Aout.x += margin;
   if (aSide === "left") Aout.x -= margin;
   if (aSide === "top") Aout.y -= margin;
   if (aSide === "bottom") Aout.y += margin;

   if (bSide === "right") Bout.x += margin;
   if (bSide === "left") Bout.x -= margin;
   if (bSide === "top") Bout.y -= margin;
   if (bSide === "bottom") Bout.y += margin;

   const pts: Point[] = [A, Aout];

   // try a simple rectilinear L-shape
   let candidate: Point[] = [];
   if (Math.random() > 0.5) {
      candidate = [{ x: Bout.x, y: Aout.y }]; // horizontal then vertical
   } else {
      candidate = [{ x: Aout.x, y: Bout.y }]; // vertical then horizontal
   }
   candidate.push(Bout);

   // check if any of those segments cross A or B
   let intersects = false;
   const allBoxes = [a, b];
   const testPath = [Aout, ...candidate];
   for (let i = 0; i < testPath.length - 1; i++) {
      for (const r of allBoxes) {
         if (segmentHitsBox(testPath[i], testPath[i + 1], r)) {
            intersects = true;
         }
      }
   }

   if (!intersects) {
      pts.push(...candidate);
   } else {
      // fallback: route *around* the boxes completely
      if (a.right <= b.left) {
         // b is to the right of a → route above or below
         const laneY = Aout.y < a.top ? a.top - margin : a.bottom + margin;
         pts.push({ x: Aout.x, y: laneY });
         pts.push({ x: Bout.x, y: laneY });
         pts.push(Bout);
      } else if (a.bottom <= b.top) {
         // b is below a
         const laneX = Aout.x < a.left ? a.left - margin : a.right + margin;
         pts.push({ x: laneX, y: Aout.y });
         pts.push({ x: laneX, y: Bout.y });
         pts.push(Bout);
      } else {
         // fallback big dog-leg: go around both boxes’ bounding box
         const outerX = Math.max(a.right, b.right) + margin;
         pts.push({ x: outerX, y: Aout.y });
         pts.push({ x: outerX, y: Bout.y });
         pts.push(Bout);
      }
   }

   pts.push(B);

   // dedup
   const out: Point[] = [];
   for (const p of pts) {
      const last = out[out.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
   }
   return out;
}

function routeOrthogonalStrict(
   a: rect,
   b: rect,
   margin = 16,
   aSide: Side = "right",
   bSide: Side = "left",
): Point[] {
   const A = anchor(a, aSide);
   const B = anchor(b, bSide);

   // Step outside the boxes by margin
   const Aout = { ...A };
   const Bout = { ...B };
   if (aSide === "right") Aout.x += margin;
   if (aSide === "left") Aout.x -= margin;
   if (aSide === "top") Aout.y -= margin;
   if (aSide === "bottom") Aout.y += margin;

   if (bSide === "right") Bout.x += margin;
   if (bSide === "left") Bout.x -= margin;
   if (bSide === "top") Bout.y -= margin;
   if (bSide === "bottom") Bout.y += margin;

   const pts: Point[] = [A, Aout];

   // --- Connect Aout → Bout safely ---
   if (aSide === "left" || aSide === "right") {
      // Horizontal case
      if (
         // If straight horizontal + vertical bend would cut through boxes
         (Aout.y >= a.top && Aout.y <= a.bottom) ||
         (Bout.y >= b.top && Bout.y <= b.bottom)
      ) {
         // Route around vertically
         const laneY =
            Aout.y < Math.min(a.top, b.top)
               ? Math.min(a.top, b.top) - margin
               : Math.max(a.bottom, b.bottom) + margin;

         pts.push({ x: Aout.x, y: laneY });
         pts.push({ x: Bout.x, y: laneY });
      } else {
         // Safe Z shape
         const midX = (Aout.x + Bout.x) / 2;
         pts.push({ x: midX, y: Aout.y });
         pts.push({ x: midX, y: Bout.y });
      }
   } else {
      // Vertical case
      if ((Aout.x >= a.left && Aout.x <= a.right) || (Bout.x >= b.left && Bout.x <= b.right)) {
         // Route around horizontally
         const laneX =
            Aout.x < Math.min(a.left, b.left)
               ? Math.min(a.left, b.left) - margin
               : Math.max(a.right, b.right) + margin;

         pts.push({ x: laneX, y: Aout.y });
         pts.push({ x: laneX, y: Bout.y });
      } else {
         // Safe Z shape
         const midY = (Aout.y + Bout.y) / 2;
         pts.push({ x: Aout.x, y: midY });
         pts.push({ x: Bout.x, y: midY });
      }
   }

   pts.push(Bout, B);

   // Deduplicate consecutive identical points
   const out: Point[] = [];
   for (const p of pts) {
      const last = out[out.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
   }
   return out;
}

function routeOrthogonalClean(
   a: rect,
   b: rect,
   margin = 12,
   aSide: Side = "right",
   bSide: Side = "left",
): Point[] {
   const A = anchor(a, aSide);
   const B = anchor(b, bSide);

   // Step out of the boxes
   const Aout: Point = { ...A };
   const Bout: Point = { ...B };
   if (aSide === "right") Aout.x += margin;
   if (aSide === "left") Aout.x -= margin;
   if (aSide === "top") Aout.y -= margin;
   if (aSide === "bottom") Aout.y += margin;

   if (bSide === "right") Bout.x += margin;
   if (bSide === "left") Bout.x -= margin;
   if (bSide === "top") Bout.y -= margin;
   if (bSide === "bottom") Bout.y += margin;

   const pts: Point[] = [A, Aout];

   // Try the simplest rectilinear (Z-shape)
   let candidate: Point[];
   if (aSide === "left" || aSide === "right") {
      // horizontal then vertical
      candidate = [{ x: Bout.x, y: Aout.y }, Bout];
   } else {
      // vertical then horizontal
      candidate = [{ x: Aout.x, y: Bout.y }, Bout];
   }

   // Check if candidate crosses either box
   let intersects = false;
   const test = [Aout, ...candidate];
   for (let i = 0; i < test.length - 1; i++) {
      if (segmentHitsBox(test[i], test[i + 1], a) || segmentHitsBox(test[i], test[i + 1], b)) {
         intersects = true;
         break;
      }
   }

   if (!intersects) {
      pts.push(...candidate);
   } else {
      // fallback: detour around
      if (aSide === "left" || aSide === "right") {
         const laneY =
            Aout.y < Math.min(a.top, b.top)
               ? Math.min(a.top, b.top) - margin
               : Math.max(a.bottom, b.bottom) + margin;
         pts.push({ x: Aout.x, y: laneY });
         pts.push({ x: Bout.x, y: laneY });
         pts.push(Bout);
      } else {
         const laneX =
            Aout.x < Math.min(a.left, b.left)
               ? Math.min(a.left, b.left) - margin
               : Math.max(a.right, b.right) + margin;
         pts.push({ x: laneX, y: Aout.y });
         pts.push({ x: laneX, y: Bout.y });
         pts.push(Bout);
      }
   }

   pts.push(B);

   // Deduplicate
   const out: Point[] = [];
   for (const p of pts) {
      const last = out[out.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) out.push(p);
   }
   return out;
}

const sides: Side[] = ["left", "right", "top", "bottom"];
// Main robust router
function routeOrthogonalRobust(
   a: rect,
   b: rect,
   margin = 12,
   aSide: Side = "right",
   bSide: Side = "left",
   otherObstacles: rect[] = [], // pass other boxes to avoid as well
): Point[] {
   const A = anchor(a, aSide);
   const B = anchor(b, bSide);

   // step out
   const Aout = { ...A };
   const Bout = { ...B };
   if (aSide === "right") Aout.x += margin;
   if (aSide === "left") Aout.x -= margin;
   if (aSide === "top") Aout.y -= margin;
   if (aSide === "bottom") Aout.y += margin;

   if (bSide === "right") Bout.x += margin;
   if (bSide === "left") Bout.x -= margin;
   if (bSide === "top") Bout.y -= margin;
   if (bSide === "bottom") Bout.y += margin;

   const obstacles = [a, b, ...otherObstacles];

   const candidates: Point[][] = [];

   // 1) Direct L-shapes (two L orders)
   if (aSide === "left" || aSide === "right") {
      candidates.push([A, Aout, { x: Bout.x, y: Aout.y }, Bout, B]); // horiz then vert
      candidates.push([A, Aout, { x: Aout.x, y: Bout.y }, Bout, B]); // vert then horiz
   } else {
      candidates.push([A, Aout, { x: Aout.x, y: Bout.y }, Bout, B]); // vert then horiz
      candidates.push([A, Aout, { x: Bout.x, y: Aout.y }, Bout, B]); // horiz then vert
   }

   // 2) Z-shapes / mid lanes using candidate X/Y coordinates derived from box edges
   const xs = new Set<number>([
      Aout.x,
      Bout.x,
      a.left - margin,
      a.right + margin,
      b.left - margin,
      b.right + margin,
   ]);
   const ys = new Set<number>([
      Aout.y,
      Bout.y,
      a.top - margin,
      a.bottom + margin,
      b.top - margin,
      b.bottom + margin,
   ]);

   const xsList = Array.from(xs).sort((u, v) => u - v);
   const ysList = Array.from(ys).sort((u, v) => u - v);

   for (const mx of xsList) {
      candidates.push([A, Aout, { x: mx, y: Aout.y }, { x: mx, y: Bout.y }, Bout, B]);
   }
   for (const my of ysList) {
      candidates.push([A, Aout, { x: Aout.x, y: my }, { x: Bout.x, y: my }, Bout, B]);
   }

   // 3) Outer fallback lanes (go completely around bounding box)
   const outerLeft = Math.min(a.left, b.left) - margin * 2;
   const outerRight = Math.max(a.right, b.right) + margin * 2;
   const outerTop = Math.min(a.top, b.top) - margin * 2;
   const outerBottom = Math.max(a.bottom, b.bottom) + margin * 2;

   // horizontal outer (above or below)
   candidates.push([A, Aout, { x: Aout.x, y: outerTop }, { x: Bout.x, y: outerTop }, Bout, B]);
   candidates.push([
      A,
      Aout,
      { x: Aout.x, y: outerBottom },
      { x: Bout.x, y: outerBottom },
      Bout,
      B,
   ]);

   // vertical outer (left or right)
   candidates.push([A, Aout, { x: outerLeft, y: Aout.y }, { x: outerLeft, y: Bout.y }, Bout, B]);
   candidates.push([A, Aout, { x: outerRight, y: Aout.y }, { x: outerRight, y: Bout.y }, Bout, B]);

   // Normalize candidates (remove consecutive duplicate points)
   const normalize = (p: Point[]) => {
      const out: Point[] = [];
      for (const q of p) {
         const last = out[out.length - 1];
         if (!last || last.x !== q.x || last.y !== q.y) out.push(q);
      }
      return out;
   };

   const validCandidates: { path: Point[]; bends: number; len: number }[] = [];
   for (const cand of candidates) {
      const path = normalize(cand);
      if (pathIsValid(path, obstacles)) {
         validCandidates.push({ path, bends: path.length - 2, len: manhattanLength(path) });
      }
   }

   // pick best: fewest bends, then shortest length, deterministic tie-break by coordinates
   if (validCandidates.length > 0) {
      validCandidates.sort((p, q) => {
         if (p.bends !== q.bends) return p.bends - q.bends;
         if (p.len !== q.len) return p.len - q.len;
         // deterministic tie-break
         const psum = p.path.reduce((s, pt) => s + pt.x + pt.y, 0);
         const qsum = q.path.reduce((s, pt) => s + pt.x + pt.y, 0);
         return psum - qsum;
      });
      return validCandidates[0].path;
   }

   // If nothing valid (very unlikely), fallback to a big outer dog-leg:
   const fallback = normalize([
      A,
      Aout,
      { x: outerRight, y: Aout.y },
      { x: outerRight, y: Bout.y },
      Bout,
      B,
   ]);
   return fallback;
}

function normalizePath(points: Point[]): Point[] {
   const out: Point[] = [];
   for (const p of points) {
      const last = out[out.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) {
         out.push(p);
      }
   }
   // Remove collinear midpoints
   const clean: Point[] = [];
   for (let i = 0; i < out.length; i++) {
      if (
         i > 0 &&
         i < out.length - 1 &&
         ((out[i - 1].x === out[i].x && out[i].x === out[i + 1].x) ||
            (out[i - 1].y === out[i].y && out[i].y === out[i + 1].y))
      ) {
         continue; // skip collinear
      }
      clean.push(out[i]);
   }
   return clean;
}

function routeOrthogonalRobustDynamic(
   a: rect,
   b: rect,
   margin = 12,
   aSide: Side = "right",
   bSide: Side = "left",
   otherObstacles: rect[] = [],
): Point[] {
   const obstacles = [a, b, ...otherObstacles];

   function tryRoute(
      sideA: Side,
      sideB: Side,
   ): { path: Point[]; bends: number; len: number } | null {
      const path = routeOrthogonalRobust(a, b, margin, sideA, sideB, otherObstacles);
      if (path && pathIsValid(path, obstacles)) {
         return { path, bends: path.length - 2, len: manhattanLength(path) };
      }
      return null;
   }

   // 1) First try with given anchors
   const firstTry = tryRoute(aSide, bSide);
   if (firstTry) return normalizePath(firstTry.path);

   // 2) Try alternatives for aSide
   let best: { path: Point[]; bends: number; len: number } | null = null;
   for (const sa of sides) {
      for (const sb of sides) {
         const cand = tryRoute(sa, sb);
         if (!cand) continue;
         if (
            !best ||
            cand.bends < best.bends ||
            (cand.bends === best.bends && cand.len < best.len)
         ) {
            best = cand;
         }
      }
   }

   // 3) Fallback if absolutely nothing works
   if (!best) {
      const fallback = routeOrthogonalRobust(a, b, margin, aSide, bSide, otherObstacles);
      return normalizePath(fallback);
   }

   return normalizePath(best.path);
}

function snapShape({ shape, board }: { current: Point; board: Board; shape: Shape }): {
   lines: Shape[];
} {
   let snapped = false;
   const linesV: Shape[] = [];
   const linesH: Shape[] = [];

   const newLine = (p1: Point, p2: Point, o: "h" | "v") => {
      const left = Math.min(p1.x, p2.x);
      const top = Math.min(p1.y, p2.y);

      const l = new Path({
         _board: board,
         ctx: board.ctx,
         left,
         top,
         selectionAlpha: 1,
         selectionColor: SnapeLineColor,
         selectionStrokeWidth: 2,
         points: [
            { x: p1.x - left, y: p1.y - top },
            { x: p2.x - left, y: p2.y - top },
         ],
      });

      if (o == "v" && linesV.length < 2) {
         linesV.push(l);
      }

      if (o == "h" && linesH.length < 2) {
         linesH.push(l);
      }
   };

   // shape being moved
   const sTop = shape.top;
   const sLeft = shape.left;
   const sRight = sLeft + shape.width;
   const sBottom = sTop + shape.height;
   const sMidX = sLeft + shape.width / 2;
   const sMidY = sTop + shape.height / 2;

   const SNAP_TOLERANCE = 5;

   board.shapeStore.forEach((sha) => {
      if (shape.ID() === sha.ID()) return false;

      const top = sha.top;
      const left = sha.left;
      const right = left + sha.width;
      const bottom = top + sha.height;
      const midX = left + sha.width / 2;
      const midY = top + sha.height / 2;

      // ---------------- HORIZONTAL ALIGNMENTS ----------------
      // top ↔ top
      if (Math.abs(top - sTop) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: top }, { x: sMidX, y: top }, "h");
         if (!snapped) {
            shape.set({
               top: top,
            });
            snapped = true;
         }
      }
      // mid ↔ top
      if (Math.abs(midY - sTop) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: sMidX, y: midY }, "h");
         if (!snapped) {
            shape.set({
               top: midY,
            });
            snapped = true;
         }
      }
      // bottom ↔ top
      if (Math.abs(bottom - sTop) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: bottom }, { x: sMidX, y: bottom }, "h");
         if (!snapped) {
            shape.set({
               top: bottom,
            });
            snapped = true;
         }
      }

      // top ↔ mid
      if (Math.abs(top - sMidY) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: top }, { x: sMidX, y: top }, "h");
         if (!snapped) {
            shape.set({
               top: top - Math.floor(shape.height / 2),
            });
            snapped = true;
         }
      }
      // mid ↔ mid
      if (Math.abs(midY - sMidY) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: sMidX, y: midY }, "h");
         if (!snapped) {
            shape.set({
               top: midY - Math.floor(shape.height / 2),
            });
            snapped = true;
         }
      }
      // bottom ↔ mid
      if (Math.abs(bottom - sMidY) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: bottom }, { x: sMidX, y: bottom }, "h");
         if (!snapped) {
            shape.set({
               top: bottom - Math.floor(shape.height / 2),
            });
            snapped = true;
         }
      }

      // top ↔ bottom
      if (Math.abs(top - sBottom) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: top }, { x: sMidX, y: top }, "h");
         if (!snapped) {
            shape.set({
               top: top - shape.height,
            });
            snapped = true;
         }
      }
      // mid ↔ bottom
      if (Math.abs(midY - sBottom) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: sMidX, y: midY }, "h");
         if (!snapped) {
            shape.set({
               top: midY - shape.height,
            });
            snapped = true;
         }
      }
      // bottom ↔ bottom
      if (Math.abs(bottom - sBottom) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: bottom }, { x: sMidX, y: bottom }, "h");
         if (!snapped) {
            shape.set({
               top: bottom - shape.height,
            });
            snapped = true;
         }
      }

      // ---------------- VERTICAL ALIGNMENTS ----------------
      // left ↔ left
      if (Math.abs(left - sLeft) < SNAP_TOLERANCE) {
         newLine({ x: left, y: midY }, { x: left, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: left,
            });
            snapped = true;
         }
      }
      // center ↔ left
      if (Math.abs(midX - sLeft) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: midX, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: midX,
            });
            snapped = true;
         }
      }
      // right ↔ left
      if (Math.abs(right - sLeft) < SNAP_TOLERANCE) {
         newLine({ x: right, y: midY }, { x: right, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: right,
            });
            snapped = true;
         }
      }

      // left ↔ center
      if (Math.abs(left - sMidX) < SNAP_TOLERANCE) {
         newLine({ x: left, y: midY }, { x: left, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: left - Math.floor(shape.width / 2),
            });
            snapped = true;
         }
      }
      // center ↔ center
      if (Math.abs(midX - sMidX) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: midX, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: left + Math.floor(shape.width / 2),
            });
            snapped = true;
         }
      }
      // right ↔ center
      if (Math.abs(right - sMidX) < SNAP_TOLERANCE) {
         newLine({ x: right, y: midY }, { x: right, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: right - Math.floor(shape.width / 2),
            });
            snapped = true;
         }
      }

      // left ↔ right
      if (Math.abs(left - sRight) < SNAP_TOLERANCE) {
         newLine({ x: left, y: midY }, { x: left, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: left - shape.width,
            });
            snapped = true;
         }
      }
      // center ↔ right
      if (Math.abs(midX - sRight) < SNAP_TOLERANCE) {
         newLine({ x: midX, y: midY }, { x: midX, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: midX - shape.width,
            });
            snapped = true;
         }
      }
      // right ↔ right
      if (Math.abs(right - sRight) < SNAP_TOLERANCE) {
         newLine({ x: right, y: midY }, { x: right, y: sMidY }, "v");
         if (!snapped) {
            shape.set({
               left: right - shape.width,
            });
            snapped = true;
         }
      }

      return false;
   });

   return { lines: [...linesH, ...linesV] };
}

export {
   snapShape,
   calcPointWithRotation,
   routeOrthogonalStrict,
   routeOrthogonalRobustDynamic,
   routeOrthogonalClean,
   routeOrthogonalDynamic,
   routeOrthogonalRobust,
   routeOrthogonal,
   IsIn,
   intersectLineWithBox,
   setCoords,
   flipXandYByDirection,
   isNearLineSegment,
   generateShapeByShapeType,
   isPointOnSegment,
   isPointNearSegment,
   breakText,
};
