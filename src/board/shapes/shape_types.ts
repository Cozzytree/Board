import type { BoxInterface, Point } from "../types";
import type { Shape } from "@/board/index";

export type Side = "left" | "right" | "top" | "bottom";
export type connection = {
  s: Shape;
  connected: "s" | "e";
  anchor?: Side;
  coords?: { x: number; y: number };
  index?: number;
};

export type connectionEventData = { s: Shape; p: Point; c: connection };
// export type ConnectionEventCallback = (e: connectionEevntData) => void;

export interface ConnectionInterface {
  shapes: connection[];

  getByConnection(c: "s" | "e"): connection | null;

  size(): number;

  add(c: connection): boolean;

  forEach(callback: (c: connection) => boolean | void): connection | null;

  clear(c: "s" | "e", id?: string): void;

  delete(id: string): void;
}

export type ActiveSelectionShape = {
  oldProps?: BoxInterface;
  s: Shape;
  offset?: Point;
};

export type LineType = "curve" | "straight" | "anchor";

export type LineProps = {
  points?: Point[];
  lineType?: LineType;
};
