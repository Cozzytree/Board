export type Identity<T> = { [K in keyof T]: T[K] | any };

export type textAlign = "left" | "center" | "right";

import type { Shape, Board } from "./index";
import type { ConnectionInterface } from "./shapes/shape_types";

export type ConnectionPoint = {
   s: Shape | null;
   position: () => Point;
};

export type ShapeEvent =
   | "mousedown"
   | "mouseup"
   | "mouseover"
   | "move"
   | "resize"
   | "shape:removed"
   | "shape:created"
   | "shape:updated"
   | "shape:resize"
   | "shape:move";

export type ShapeEventData = {
   e: { point: Point };
};

export type ShapeEventCallback = (shape: Shape, data?: ShapeEventData) => void;

export type ShapeProps = {
   fontSize?: number;
   verticalAlign?: "top" | "center" | "bottom";
   textAlign?: textAlign;
   left?: number;
   top?: number;
   width?: number;
   height?: number;
   stroke?: string;
   fill?: string;
   rotate?: number;
   ctx: CanvasRenderingContext2D;
   _board: Board;
   strokeWidth?: number;
   scale?: number;
   flipX?: boolean;
   flipY?: boolean;
   id?: string;
   type?: shapeType;
   dash?: [number, number];
   text?: string;
   connections?: ConnectionInterface;
};

export type ToolCallback = (args: { mode: modes; submode: submodes }) => void;

export type ToolEventData = { p: Point; e: MouseEvent | PointerEvent | WheelEvent | TouchEvent };

export interface ToolInterface {
   pointerDown(e: ToolEventData): void;
   pointermove(e: ToolEventData): void;
   pointerup(e: ToolEventData, cb?: ToolCallback): void;
   dblClick(e: ToolEventData): void;
   onClick(e: ToolEventData): void;
   cleanUp(): void;
}

export interface Point {
   x: number;
   y: number;
}

export interface ShapeInterface {
   draw(options: { ctx?: CanvasRenderingContext2D; addStyles?: boolean }): void;
   ID(): string;
   mouseup(s: ShapeEventData): void;
   mouseover(s: ShapeEventData): void;
   mousedown(s: ShapeEventData): void;
   IsDraggable(p: Point): boolean;
   IsResizable(p: Point): resizeDirection | null;
   Resize(current: Point, old: BoxInterface, d: resizeDirection): void;
   clone(): Shape;
}

export interface BoardInterface {
   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   modes: { m: modes; sm: submodes | null };
   offset: Point;
   onMouseMove?: () => void;
   onMouseUp?: () => void;
}

export type modes = "cursor" | "shape" | "line" | "draw" | "text";

export type submodeline = "line:straight" | "line:anchor" | "line:curve";
export type submodecursor = "grab" | "free";
export type submodeshape =
   | "rect"
   | "circle"
   | "path:triangle"
   | "path:pentagon"
   | "path:plus"
   | "path:diamond"
   | "path:trapezoid";
export type submodedraw = "pencil";

export type submodes = submodecursor | submodeshape | submodedraw | submodeline;

export type shapeType = "path" | "rect" | "ellipse" | "text" | "selection" | "line";

export interface BoxInterface {
   x1: number;
   y1: number;
   x2: number;
   y2: number;
}

export type resizeDirection = "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b";
