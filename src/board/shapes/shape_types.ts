import type { BoxInterface, Point } from "../types";
import type { Shape } from "@/board/index";

export type connection = { s: Shape; coords: { x: number; y: number }; connected: "s" | "e" };

export type connectionEventData = { s: Shape; p: Point; c: connection };
// export type ConnectionEventCallback = (e: connectionEevntData) => void;

export interface ConnectionInterface {
   shapes: connection[];

   add(c: connection): boolean;

   forEach(callback: (c: connection) => boolean): connection | null;

   clear(c: "s" | "e", id?: string): void;

   delete(id: string): void;
}

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
