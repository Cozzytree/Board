import type { Point, resizeDirection, BoxInterface } from "../types";

/**
 * Resizes a shape considering its rotation angle.
 * 
 * This function handles the complex coordinate transformations needed when resizing
 * a rotated shape. It transforms the mouse position to the shape's local coordinate
 * system, calculates new dimensions, and transforms back to world space.
 * 
 * @param current - Current mouse position in world space
 * @param old - Original bounding box of the shape
 * @param direction - Resize direction (tl, tr, bl, br, l, r, t, b)
 * @param rotate - Rotation angle in radians
 * @param minWidth - Minimum width constraint (default: 20)
 * @param minHeight - Minimum height constraint (default: 20)
 * @returns New position and dimensions for the shape
 */
export function resizeWithRotation({
  current,
  old,
  direction,
  rotate,
  minWidth = 20,
  minHeight = 20,
}: {
  current: Point;
  old: BoxInterface;
  direction: resizeDirection;
  rotate: number;
  minWidth?: number;
  minHeight?: number;
}): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  // Calculate the center of the original shape
  const oldWidth = old.x2 - old.x1;
  const oldHeight = old.y2 - old.y1;
  const centerX = old.x1 + oldWidth / 2;
  const centerY = old.y1 + oldHeight / 2;

  // Transform current mouse position to local (unrotated) space
  const dx = current.x - centerX;
  const dy = current.y - centerY;
  const cos = Math.cos(-rotate);
  const sin = Math.sin(-rotate);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Calculate local bounds (relative to center)
  const halfOldWidth = oldWidth / 2;
  const halfOldHeight = oldHeight / 2;

  // Initialize new local bounds
  let localLeft = -halfOldWidth;
  let localTop = -halfOldHeight;
  let localRight = halfOldWidth;
  let localBottom = halfOldHeight;

  // Update bounds based on resize direction
  switch (direction) {
    case "tl":
      localLeft = Math.min(localX, localRight - minWidth);
      localTop = Math.min(localY, localBottom - minHeight);
      break;
    case "tr":
      localRight = Math.max(localX, localLeft + minWidth);
      localTop = Math.min(localY, localBottom - minHeight);
      break;
    case "bl":
      localLeft = Math.min(localX, localRight - minWidth);
      localBottom = Math.max(localY, localTop + minHeight);
      break;
    case "br":
      localRight = Math.max(localX, localLeft + minWidth);
      localBottom = Math.max(localY, localTop + minHeight);
      break;
    case "l":
      localLeft = Math.min(localX, localRight - minWidth);
      break;
    case "r":
      localRight = Math.max(localX, localLeft + minWidth);
      break;
    case "t":
      localTop = Math.min(localY, localBottom - minHeight);
      break;
    case "b":
      localBottom = Math.max(localY, localTop + minHeight);
      break;
  }

  // Calculate new dimensions
  const newWidth = localRight - localLeft;
  const newHeight = localBottom - localTop;

  // Calculate new center in local space
  const newLocalCenterX = (localLeft + localRight) / 2;
  const newLocalCenterY = (localTop + localBottom) / 2;

  // Transform new center back to world space
  const cosPos = Math.cos(rotate);
  const sinPos = Math.sin(rotate);
  const newCenterX = centerX + newLocalCenterX * cosPos - newLocalCenterY * sinPos;
  const newCenterY = centerY + newLocalCenterX * sinPos + newLocalCenterY * cosPos;

  // Calculate new top-left position in world space
  const newLeft = newCenterX - newWidth / 2;
  const newTop = newCenterY - newHeight / 2;

  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Alternative resize function that handles flipping when dragging past opposite edge.
 * 
 * This version allows the shape to flip when you drag a resize handle past the
 * opposite edge, which can be useful for certain interactions.
 * 
 * @param current - Current mouse position in world space
 * @param old - Original bounding box of the shape
 * @param direction - Resize direction (tl, tr, bl, br, l, r, t, b)
 * @param rotate - Rotation angle in radians
 * @param minWidth - Minimum width constraint (default: 20)
 * @param minHeight - Minimum height constraint (default: 20)
 * @returns New position and dimensions for the shape
 */
export function resizeWithRotationAndFlip({
  current,
  old,
  direction,
  rotate,
  minWidth = 20,
  minHeight = 20,
}: {
  current: Point;
  old: BoxInterface;
  direction: resizeDirection;
  rotate: number;
  minWidth?: number;
  minHeight?: number;
}): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  // Calculate the center of the original shape
  const oldWidth = old.x2 - old.x1;
  const oldHeight = old.y2 - old.y1;
  const centerX = old.x1 + oldWidth / 2;
  const centerY = old.y1 + oldHeight / 2;

  // Transform current mouse position to local (unrotated) space
  const dx = current.x - centerX;
  const dy = current.y - centerY;
  const cos = Math.cos(-rotate);
  const sin = Math.sin(-rotate);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  // Calculate local bounds (relative to center)
  const halfOldWidth = oldWidth / 2;
  const halfOldHeight = oldHeight / 2;

  // Initialize new local bounds
  let localLeft = -halfOldWidth;
  let localTop = -halfOldHeight;
  let localRight = halfOldWidth;
  let localBottom = halfOldHeight;

  // Update bounds based on resize direction (allowing flipping)
  switch (direction) {
    case "tl":
      localLeft = localX;
      localTop = localY;
      // Handle flipping
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
    case "tr":
      localRight = localX;
      localTop = localY;
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
    case "bl":
      localLeft = localX;
      localBottom = localY;
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
    case "br":
      localRight = localX;
      localBottom = localY;
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
    case "l":
      localLeft = localX;
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      break;
    case "r":
      localRight = localX;
      if (localLeft > localRight) {
        [localLeft, localRight] = [localRight, localLeft];
      }
      break;
    case "t":
      localTop = localY;
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
    case "b":
      localBottom = localY;
      if (localTop > localBottom) {
        [localTop, localBottom] = [localBottom, localTop];
      }
      break;
  }

  // Calculate new dimensions with minimum constraints
  let newWidth = localRight - localLeft;
  let newHeight = localBottom - localTop;

  // Apply minimum size constraints
  if (newWidth < minWidth) {
    const center = (localLeft + localRight) / 2;
    localLeft = center - minWidth / 2;
    localRight = center + minWidth / 2;
    newWidth = minWidth;
  }
  if (newHeight < minHeight) {
    const center = (localTop + localBottom) / 2;
    localTop = center - minHeight / 2;
    localBottom = center + minHeight / 2;
    newHeight = minHeight;
  }

  // Calculate new center in local space
  const newLocalCenterX = (localLeft + localRight) / 2;
  const newLocalCenterY = (localTop + localBottom) / 2;

  // Transform new center back to world space
  const cosPos = Math.cos(rotate);
  const sinPos = Math.sin(rotate);
  const newCenterX = centerX + newLocalCenterX * cosPos - newLocalCenterY * sinPos;
  const newCenterY = centerY + newLocalCenterX * sinPos + newLocalCenterY * cosPos;

  // Calculate new top-left position in world space
  const newLeft = newCenterX - newWidth / 2;
  const newTop = newCenterY - newHeight / 2;

  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
    height: newHeight,
  };
}
