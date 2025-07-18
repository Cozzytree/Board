import { v4 as uuidv4 } from "uuid";

import type {
   ShapeEvent,
   BoxInterface,
   Point,
   resizeDirection,
   ShapeEventCallback,
   ShapeProps,
   shapeType,
   ShapeEventData,
} from "../types";
import { Box, type Board } from "../index";
import { IsIn } from "../utils/utilfunc";

export type DrawProps = {
   active: boolean;
   ctx?: CanvasRenderingContext2D;
   addStyles?: boolean;
   resize?: boolean;
};

abstract class Shape implements ShapeProps {
   padding = 4;
   declare type: shapeType;
   declare private id: string;
   declare board: Board;

   strokeWidth: number;
   fill: string;
   height: number;
   width: number;
   left: number;
   rotate: number;
   stroke: string;
   top: number;
   ctx: CanvasRenderingContext2D;
   scale: number;

   private eventListeners = new Map<ShapeEvent, Set<ShapeEventCallback>>();

   abstract draw(options: DrawProps): void;
   abstract IsResizable(p: Point): resizeDirection | null;
   abstract IsDraggable(p: Point): boolean;
   abstract Resize(current: Point, old: BoxInterface, d: resizeDirection): void;

   abstract dragging(mousedown: Point, move: Point): void;

   constructor({
      fill,
      height,
      left,
      rotate,
      stroke,
      top,
      width,
      ctx,
      board,
      strokeWidth,
      scale,
   }: ShapeProps) {
      this.fill = fill || "#000000";
      this.height = height || 100;
      this.width = width || 100;
      this.left = left || 0;
      this.rotate = rotate || 0;
      this.stroke = stroke || "#FFFFFF";
      this.top = top || 0;
      this.ctx = ctx;
      this.board = board;
      this.scale = scale || 1;
      this.strokeWidth = strokeWidth || 2;

      this.id = uuidv4();
   }

   activeRect(ctx?: CanvasRenderingContext2D) {
      const context = ctx || this.ctx;
      const pad = this.padding;
      const x = this.left - pad;
      const y = this.top - pad;
      const w = this.width + pad * 2;
      const h = this.height + pad * 2;

      // Draw outer rectangle
      context.beginPath();
      context.strokeStyle = "white";
      context.rect(x, y, w, h);
      context.stroke();
      context.closePath();

      // Draw corner dots
      const drawDot = (cx: number, cy: number) => {
         context.beginPath();
         context.fillStyle = "white";
         context.rect(cx - 3, cy - 3, 6, 6);
         context.fill();
         context.closePath();
      };

      drawDot(x, y); // top-left
      drawDot(x + w, y); // top-right
      drawDot(x, y + h); // bottom-left
      drawDot(x + w, y + h); // bottom-right
   }

   // Subscribe
   on(event: ShapeEvent, callback: ShapeEventCallback): void {
      if (!this.eventListeners.has(event)) {
         this.eventListeners.set(event, new Set());
      }
      this.eventListeners.get(event)!.add(callback);
   }

   // Unsubscribe
   off(event: ShapeEvent, callback: ShapeEventCallback): void {
      this.eventListeners.get(event)?.delete(callback);
   }

   protected emit(event: ShapeEvent, data?: ShapeEventData): void {
      this.eventListeners.get(event)?.forEach((callback) => {
         callback(this, data);
      });
   }

   mouseup(s: ShapeEventData): void {
      this.emit("mouseup", s);
   }
   mouseover(s: ShapeEventData): void {
      this.emit("mouseover", s);
   }

   mousedown(s: ShapeEventData): void {
      this.emit("mousedown", s);
   }

   clean() {
      this.eventListeners.clear();
   }

   isWithin(p: Point): boolean {
      return IsIn({
         inner: new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 }),
         outer: new Box({
            x1: this.left - this.padding,
            y1: this.top - this.padding,
            x2: this.left + this.width + this.padding * 2,
            y2: this.top + this.height + this.padding * 2,
         }),
      });
   }

   ID(): string {
      return this.id;
   }
}

export default Shape;
