import type { BoxInterface, Point } from "../types";
import type Shape from "./shape";

export type ActiveSelectionShape = {
   oldProps?: BoxInterface;
   s: Shape;
   offset?: Point;
};

export type LineType = "curve" | "straight";

export type LineProps = {
   points?: Point[];
   lineType?: LineType;
};
