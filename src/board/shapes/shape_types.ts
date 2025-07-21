import type { BoxInterface, Point } from "../types";
import type Shape from "./shape";

export type ActiveSelectionShape = {
   oldProps?: BoxInterface;
   s: Shape;
   offset?: Point;
};
