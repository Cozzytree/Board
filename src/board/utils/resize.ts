import type { Point, resizeDirection } from "../types";
import type { Box } from "../index";

function resizeRect(down: Point, box: Box, padding: number) {
   const yTopAlign = down.y >= box.y1 - padding && down.y <= box.y1;
   const yBottomAlign = down.y >= box.y2 && down.y <= box.y2 + padding;
   const xLeftAlign = down.x >= box.x1 - padding && down.x <= box.x1;
   const xRightAlign = down.x <= box.x2 + padding && down.x >= box.x2;
   const yCenterAlign =
      down.y >= box.y2 + padding && down.y <= box.y2 - padding;
   const xCenterAlign =
      down.x >= box.x1 + padding && down.x <= box.x2 - padding;

   const topLeft = yTopAlign && xLeftAlign;
   const topRight = yTopAlign && xRightAlign;
   const bottomleft = yBottomAlign && xLeftAlign;
   const bottomRight = yBottomAlign && xRightAlign;
   const leftSide = xLeftAlign && yCenterAlign;
   const rightSide = xRightAlign && yCenterAlign;
   const topSide = xCenterAlign && yTopAlign;
   const bottomSide = xCenterAlign && yBottomAlign;

   const sides: { c: boolean; rd: resizeDirection }[] = [
      { c: topLeft, rd: "tl" },
      { c: topRight, rd: "tr" },
      { c: bottomleft, rd: "bl" },
      { c: bottomRight, rd: "br" },
      { c: leftSide, rd: "l" },
      { c: rightSide, rd: "r" },
      { c: topSide, rd: "t" },
      { c: bottomSide, rd: "b" },
   ];

   return sides.find((s) => s.c);
}

export { resizeRect };
