import type { Shape, Board } from "./index";

export type ShapeEvent =
   | "mousedown"
   | "mouseup"
   | "mousemove"
   | "move"
   | "resize";

export type ShapeEventData = {
   e: { point: Point };
};

export type ShapeEventCallback = (shape: Shape, data?: ShapeEventData) => void;

export type ShapeProps = {
   left?: number;
   top?: number;
   width?: number;
   height?: number;
   stroke?: string;
   fill?: string;
   rotate?: number;
   ctx: CanvasRenderingContext2D;
   board: Board;
};

export type ToolCallback = (args: { mode: modes; submode: submodes }) => void;

export interface Tool {
   pointerDown(e: PointerEvent | MouseEvent): void;
   pointermove(e: PointerEvent | MouseEvent): void;
   pointerup(e: PointerEvent | MouseEvent, cb?: ToolCallback): void;

   cleanUp(): void;
}

export interface Point {
   x: number;
   y: number;
}

export interface ShapeInterface {
   draw(options: {
      active: boolean;
      ctx?: CanvasRenderingContext2D;
      addStyles?: boolean;
   }): void;
   ID(): string;
   mouseup(): void;
   mousedown(): void;
   IsDraggable(p: Point): boolean;
   IsResizable(p: Point): resizeDirection | null;
   Resize(current: Point, old: BoxInterface, d: resizeDirection): void;
}

export interface BoardInterface {
   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   modes: { m: modes; sm: submodes };
   offset: [number, number];
}

export type modes = "cursor" | "shape" | "draw";

export type submodecursor = "grab" | "free";
export type submodeshape =
   | "rect"
   | "circle"
   | "path:triangle"
   | "path:pentagon";
export type submodedraw = "pencil";

export type submodes = submodecursor | submodeshape | submodedraw;

export type shapeType = "path" | "rect" | "ellipse" | "text" | "selection";

export interface BoxInterface {
   x1: number;
   y1: number;
   x2: number;
   y2: number;
}

export type resizeDirection = "tl" | "tr" | "bl" | "br" | "l" | "r" | "t" | "b";
