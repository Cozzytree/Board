import type { Point, resizeDirection } from "../types";
import type { Box } from "../index";

function resizeRect(down: Point, box: Box, padding: number) {
   const yTopAlign = down.y >= box.y1 - padding && down.y <= box.y1 + padding;
   const yBottomAlign = down.y >= box.y2 - padding && down.y <= box.y2 + padding;
   const xLeftAlign = down.x >= box.x1 - padding && down.x <= box.x1 + padding;
   const xRightAlign = down.x >= box.x2 - padding && down.x <= box.x2 + padding;

   const yCenterAlign = down.y >= box.y1 + padding && down.y <= box.y2 - padding;
   const xCenterAlign = down.x >= box.x1 + padding && down.x <= box.x2 - padding;

   const topLeft = yTopAlign && xLeftAlign;
   const topRight = yTopAlign && xRightAlign;
   const bottomLeft = yBottomAlign && xLeftAlign;
   const bottomRight = yBottomAlign && xRightAlign;
   const leftSide = xLeftAlign && yCenterAlign;
   const rightSide = xRightAlign && yCenterAlign;
   const topSide = yTopAlign && xCenterAlign;
   const bottomSide = yBottomAlign && xCenterAlign;

   const sides: { c: boolean; rd: resizeDirection }[] = [
      { c: topLeft, rd: "tl" },
      { c: topRight, rd: "tr" },
      { c: bottomLeft, rd: "bl" },
      { c: bottomRight, rd: "br" },
      { c: leftSide, rd: "l" },
      { c: rightSide, rd: "r" },
      { c: topSide, rd: "t" },
      { c: bottomSide, rd: "b" },
   ];

   return sides.find((s) => s.c);
}

/**
 * Check if a point is inside a rotated rectangle.
 * 
 * This function transforms the point from world space to the rectangle's local
 * (unrotated) coordinate system and then performs a simple bounds check.
 * 
 * @param point - The point to check (in world space)
 * @param left - Left position of the rectangle
 * @param top - Top position of the rectangle
 * @param width - Width of the rectangle
 * @param height - Height of the rectangle
 * @param rotate - Rotation angle in radians
 * @returns true if the point is inside the rotated rectangle, false otherwise
 */
function isDraggableWithRotation({
   point,
   left,
   top,
   width,
   height,
   rotate,
}: {
   point: Point;
   left: number;
   top: number;
   width: number;
   height: number;
   rotate: number;
}): boolean {
   // Calculate the center of the rectangle
   const centerX = left + width / 2;
   const centerY = top + height / 2;

   // Translate point to origin (relative to center)
   const dx = point.x - centerX;
   const dy = point.y - centerY;

   // Apply inverse rotation to transform point to local space
   const cos = Math.cos(-rotate);
   const sin = Math.sin(-rotate);
   const localX = dx * cos - dy * sin;
   const localY = dx * sin + dy * cos;

   // Check against unrotated rectangle bounds (centered at origin)
   const halfW = width / 2;
   const halfH = height / 2;

   return localX > -halfW && localX < halfW && localY > -halfH && localY < halfH;
}

export { resizeRect, isDraggableWithRotation };
