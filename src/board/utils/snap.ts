// Improved snap logic

import { Path } from "../index";
import { SnapeLineColor } from "../constants";
import type Board from "../board";
import type Shape from "../shapes/shape";
import type { Point } from "../types";

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
  const linesV: Shape[] = [];
  const linesH: Shape[] = [];

  // Track which axes have been snapped to prevent multiple snaps
  let snappedHorizontal = false;
  let snappedVertical = false;

  let newX = x;
  let newY = y;

  // Store potential snap positions with their distances
  const horizontalSnaps: {
    position: number;
    distance: number;
    line: { p1: Point; p2: Point };
  }[] = [];
  const verticalSnaps: {
    position: number;
    distance: number;
    line: { p1: Point; p2: Point };
  }[] = [];

  const newLine = (p1: Point, p2: Point, o: "h" | "v") => {
    const left = Math.min(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);

    const l = new Path({
      _board: board,
      ctx: board.ctx,
      strokeWidth: 0.5,
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

    if (o == "v") {
      linesV.push(l);
    } else if (o == "h") {
      linesH.push(l);
    }
  };

  // shape being moved
  // Use passed x/y instead of shape properties
  const sTop = y;
  const sLeft = x;
  const sRight = sLeft + shape.width;
  const sBottom = sTop + shape.height;
  const sMidX = sLeft + shape.width / 2;
  const sMidY = sTop + shape.height / 2;

  const SNAP_TOLERANCE = 10;
  // Removed DEAD_ZONE as we are now using true position tracking

  // Viewport bounds for optimization
  const viewX = -board.view.x / board.view.scl;
  const viewY = -board.view.y / board.view.scl;
  const viewW = board.canvas.width / board.view.scl;
  const viewH = board.canvas.height / board.view.scl;

  board.shapeStore.forEach((sha) => {
    // Skip self
    if (shape.ID() === sha.ID()) return false;
    // Skip shapes in selection
    if (sha.connections.forEach((c) => c.s.ID() == shape.ID())) return false;

    // Optimization: Skip off-screen shapes (with margin)
    if (
      sha.left + sha.width < viewX - 100 ||
      sha.left > viewX + viewW + 100 ||
      sha.top + sha.height < viewY - 100 ||
      sha.top > viewY + viewH + 100
    ) {
      return false;
    }

    const top = sha.top;
    const left = sha.left;
    const right = left + sha.width;
    const bottom = top + sha.height;
    const midX = left + sha.width / 2;
    const midY = top + sha.height / 2;

    // ---------------- HORIZONTAL ALIGNMENTS ----------------
    const horizontalChecks = [
      {
        target: top,
        source: sTop,
        offset: 0,
        p1: { x: midX, y: top },
        p2: { x: sMidX, y: top },
      },
      {
        target: midY,
        source: sTop,
        offset: 0,
        p1: { x: midX, y: midY },
        p2: { x: sMidX, y: midY },
      },
      {
        target: bottom,
        source: sTop,
        offset: 0,
        p1: { x: midX, y: bottom },
        p2: { x: sMidX, y: bottom },
      },
      {
        target: top,
        source: sMidY,
        offset: -shape.height / 2,
        p1: { x: midX, y: top },
        p2: { x: sMidX, y: top },
      },
      {
        target: midY,
        source: sMidY,
        offset: -shape.height / 2,
        p1: { x: midX, y: midY },
        p2: { x: sMidX, y: midY },
      },
      {
        target: bottom,
        source: sMidY,
        offset: -shape.height / 2,
        p1: { x: midX, y: bottom },
        p2: { x: sMidX, y: bottom },
      },
      {
        target: top,
        source: sBottom,
        offset: -shape.height,
        p1: { x: midX, y: top },
        p2: { x: sMidX, y: top },
      },
      {
        target: midY,
        source: sBottom,
        offset: -shape.height,
        p1: { x: midX, y: midY },
        p2: { x: sMidX, y: midY },
      },
      {
        target: bottom,
        source: sBottom,
        offset: -shape.height,
        p1: { x: midX, y: bottom },
        p2: { x: sMidX, y: bottom },
      },
    ];

    horizontalChecks.forEach(({ target, source, offset, p1, p2 }) => {
      const distance = Math.abs(target - source);
      if (distance < SNAP_TOLERANCE) {
        horizontalSnaps.push({
          position: target + offset,
          distance,
          line: { p1, p2 },
        });
      }
    });

    // ---------------- VERTICAL ALIGNMENTS ----------------
    const verticalChecks = [
      {
        target: left,
        source: sLeft,
        offset: 0,
        p1: { x: left, y: midY },
        p2: { x: left, y: sMidY },
      },
      {
        target: midX,
        source: sLeft,
        offset: 0,
        p1: { x: midX, y: midY },
        p2: { x: midX, y: sMidY },
      },
      {
        target: right,
        source: sLeft,
        offset: 0,
        p1: { x: right, y: midY },
        p2: { x: right, y: sMidY },
      },
      {
        target: left,
        source: sMidX,
        offset: -shape.width / 2,
        p1: { x: left, y: midY },
        p2: { x: left, y: sMidY },
      },
      {
        target: midX,
        source: sMidX,
        offset: -shape.width / 2,
        p1: { x: midX, y: midY },
        p2: { x: midX, y: sMidY },
      },
      {
        target: right,
        source: sMidX,
        offset: -shape.width / 2,
        p1: { x: right, y: midY },
        p2: { x: right, y: sMidY },
      },
      {
        target: left,
        source: sRight,
        offset: -shape.width,
        p1: { x: left, y: midY },
        p2: { x: left, y: sMidY },
      },
      {
        target: midX,
        source: sRight,
        offset: -shape.width,
        p1: { x: midX, y: midY },
        p2: { x: midX, y: sMidY },
      },
      {
        target: right,
        source: sRight,
        offset: -shape.width,
        p1: { x: right, y: midY },
        p2: { x: right, y: sMidY },
      },
    ];

    verticalChecks.forEach(({ target, source, offset, p1, p2 }) => {
      const distance = Math.abs(target - source);
      if (distance < SNAP_TOLERANCE) {
        verticalSnaps.push({
          position: target + offset,
          distance,
          line: { p1, p2 },
        });
      }
    });

    return false;
  });

  // Apply the closest horizontal snap (if any)
  if (horizontalSnaps.length > 0 && !snappedHorizontal) {
    // Sort by distance and take the closest
    horizontalSnaps.sort((a, b) => a.distance - b.distance);
    const closest = horizontalSnaps[0];
    newY = closest.position;
    snappedHorizontal = true;

    // Show deduplicated lines for the top 3 closest snaps
    const uniqueLines = deduplicateSnapLines(horizontalSnaps.slice(0, 3), "h");
    uniqueLines.forEach((snap) => newLine(snap.line.p1, snap.line.p2, "h"));
  }

  // Apply the closest vertical snap (if any)
  if (verticalSnaps.length > 0 && !snappedVertical) {
    // Sort by distance and take the closest
    verticalSnaps.sort((a, b) => a.distance - b.distance);
    const closest = verticalSnaps[0];

    newX = closest.position;
    snappedVertical = true;

    // Show deduplicated lines for the top 3 closest snaps
    const uniqueLines = deduplicateSnapLines(verticalSnaps.slice(0, 3), "v");
    uniqueLines.forEach((snap) => newLine(snap.line.p1, snap.line.p2, "v"));
  }

  return { lines: [...linesH, ...linesV], x: newX, y: newY };
}

/**
 * Deduplicate snap lines that are very close to each other
 */
function deduplicateSnapLines(
  snaps: { position: number; distance: number; line: { p1: Point; p2: Point } }[],
  orientation: "h" | "v"
): { position: number; distance: number; line: { p1: Point; p2: Point } }[] {
  if (snaps.length === 0) return [];

  const unique: typeof snaps = [];
  const MERGE_THRESHOLD = 2; // Merge lines within 2 pixels

  snaps.forEach((snap) => {
    const coord = orientation === "h" ? snap.line.p1.y : snap.line.p1.x;
    const isDuplicate = unique.some((existing) => {
      const existingCoord = orientation === "h" ? existing.line.p1.y : existing.line.p1.x;
      return Math.abs(coord - existingCoord) < MERGE_THRESHOLD;
    });

    if (!isDuplicate) {
      unique.push(snap);
    }
  });

  return unique;
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
