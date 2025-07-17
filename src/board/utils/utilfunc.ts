import type { Box } from "../index";

function IsIn({ inner, outer }: { inner: Box; outer: Box }): boolean {
   return (
      inner.x1 > outer.x1 &&
      inner.x2 < outer.x2 &&
      inner.y1 > outer.y1 &&
      inner.y2 < outer.y2
   );
}

export { IsIn };
