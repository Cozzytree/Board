// Excalidraw-style snap logic — at most 1 horizontal + 1 vertical guide line

import { Path } from "../index";
import { SnapeLineColor } from "../constants";
import type Board from "../board";
import type Shape from "../shapes/shape";
import type { Point } from "../types";

const SNAP_TOLERANCE = 5;
const GUIDE_EXTENSION = 10; // pixels to extend lines beyond shape edges

type SnapCandidate = {
  /** The snapped `left` or `top` value for the moving shape */
  snappedPos: number;
  /** Absolute distance from unsnapped position to snap target */
  distance: number;
  /** The coordinate where the guide line sits (x for vertical, y for horizontal) */
  guideCoord: number;
  /** The target shape that generated this snap (used for guide bounds) */
  targetShape: Shape;
  /** Which edge of the moving shape matched: "start" | "center" | "end" */
  sourceEdge: string;
  /** Which edge of the target matched: "start" | "center" | "end" */
  targetEdge: string;
};

export function snapShape({
  shape,
  board,
  x,
  y,
}: {
  current?: Point;
  board: Board;
  shape: Shape;
  x: number;
  y: number;
}): {
  lines: Shape[];
  x: number;
  y: number;
} {
  const hCandidates: SnapCandidate[] = []; // horizontal guides (snap Y)
  const vCandidates: SnapCandidate[] = []; // vertical guides (snap X)

  // Moving shape edges (using the unsnapped x/y)
  const sLeft = x;
  const sTop = y;
  const sRight = sLeft + shape.width;
  const sBottom = sTop + shape.height;
  const sCenterX = sLeft + shape.width / 2;
  const sCenterY = sTop + shape.height / 2;

  // Source snap points
  const sourceH = [
    { value: sTop, edge: "start", offset: 0 },
    { value: sCenterY, edge: "center", offset: -shape.height / 2 },
    { value: sBottom, edge: "end", offset: -shape.height },
  ];
  const sourceV = [
    { value: sLeft, edge: "start", offset: 0 },
    { value: sCenterX, edge: "center", offset: -shape.width / 2 },
    { value: sRight, edge: "end", offset: -shape.width },
  ];

  // Viewport bounds for off-screen culling
  const viewX = -board.view.x / board.view.scl;
  const viewY = -board.view.y / board.view.scl;
  const viewW = board.canvas.width / board.view.scl;
  const viewH = board.canvas.height / board.view.scl;

  board.shapeStore.forEach((target) => {
    // Skip self
    if (shape.ID() === target.ID()) return false;
    // Skip shapes inside the selection
    if (target.connections.forEach((c) => c.s.ID() === shape.ID())) return false;

    // Cull off-screen shapes
    if (
      target.left + target.width < viewX - 100 ||
      target.left > viewX + viewW + 100 ||
      target.top + target.height < viewY - 100 ||
      target.top > viewY + viewH + 100
    ) {
      return false;
    }

    const tLeft = target.left;
    const tTop = target.top;
    const tRight = tLeft + target.width;
    const tBottom = tTop + target.height;
    const tCenterX = tLeft + target.width / 2;
    const tCenterY = tTop + target.height / 2;

    // Target snap points
    const targetH = [
      { value: tTop, edge: "start" },
      { value: tCenterY, edge: "center" },
      { value: tBottom, edge: "end" },
    ];
    const targetV = [
      { value: tLeft, edge: "start" },
      { value: tCenterX, edge: "center" },
      { value: tRight, edge: "end" },
    ];

    // ---- Horizontal alignment (Y axis) ----
    for (const src of sourceH) {
      for (const tgt of targetH) {
        const dist = Math.abs(src.value - tgt.value);
        if (dist < SNAP_TOLERANCE) {
          hCandidates.push({
            snappedPos: tgt.value + src.offset,
            distance: dist,
            guideCoord: tgt.value,
            targetShape: target,
            sourceEdge: src.edge,
            targetEdge: tgt.edge,
          });
        }
      }
    }

    // ---- Vertical alignment (X axis) ----
    for (const src of sourceV) {
      for (const tgt of targetV) {
        const dist = Math.abs(src.value - tgt.value);
        if (dist < SNAP_TOLERANCE) {
          vCandidates.push({
            snappedPos: tgt.value + src.offset,
            distance: dist,
            guideCoord: tgt.value,
            targetShape: target,
            sourceEdge: src.edge,
            targetEdge: tgt.edge,
          });
        }
      }
    }

    return false;
  });

  let newX = x;
  let newY = y;
  const lines: Shape[] = [];

  // ---- Pick best horizontal snap (closest distance) ----
  if (hCandidates.length > 0) {
    hCandidates.sort((a, b) => a.distance - b.distance);
    const best = hCandidates[0];
    newY = best.snappedPos;

    // Guide extends horizontally across both shapes
    const guideY = best.guideCoord;
    const t = best.targetShape;
    const lineX1 = Math.min(x, t.left) - GUIDE_EXTENSION;
    const lineX2 = Math.max(x + shape.width, t.left + t.width) + GUIDE_EXTENSION;

    lines.push(
      createGuideLine(board, { x: lineX1, y: guideY }, { x: lineX2, y: guideY })
    );
  }

  // ---- Pick best vertical snap (closest distance) ----
  if (vCandidates.length > 0) {
    vCandidates.sort((a, b) => a.distance - b.distance);
    const best = vCandidates[0];
    newX = best.snappedPos;

    // Guide extends vertically across both shapes
    const guideX = best.guideCoord;
    const t = best.targetShape;
    const lineY1 = Math.min(y, t.top) - GUIDE_EXTENSION;
    const lineY2 = Math.max(y + shape.height, t.top + t.height) + GUIDE_EXTENSION;

    lines.push(
      createGuideLine(board, { x: guideX, y: lineY1 }, { x: guideX, y: lineY2 })
    );
  }

  return { lines, x: newX, y: newY };
}

/**
 * Create a visual guide line (Path shape) between two points.
 */
function createGuideLine(board: Board, p1: Point, p2: Point): Shape {
  const left = Math.min(p1.x, p2.x);
  const top = Math.min(p1.y, p2.y);

  return new Path({
    _board: board,
    ctx: board.ctx,
    strokeWidth: 0.5,
    left,
    top,
    selectionAlpha: 1,
    selectionColor: SnapeLineColor,
    selectionStrokeWidth: 1,
    points: [
      { x: p1.x - left, y: p1.y - top },
      { x: p2.x - left, y: p2.y - top },
    ],
  });
}

/**
 * Snap a rotation angle to the nearest increment.
 * @param angle The current rotation angle in radians.
 * @param snapIncrement The snap increment in radians (default: 45 degrees = PI/4).
 * @param tolerance The tolerance in radians (default: 5 degrees). If the angle is within this tolerance of a snap point, it snaps; otherwise, it returns the original angle.
 * @returns The snapped or original angle in radians.
 */
export function snapRotation(
  angle: number,
  snapIncrement: number = Math.PI / 4,
  tolerance: number = (5 * Math.PI) / 180,
): number {
  const snapped = Math.round(angle / snapIncrement) * snapIncrement;
  const diff = Math.abs(angle - snapped);

  if (diff <= tolerance) {
    return snapped;
  }
  return angle;
}
