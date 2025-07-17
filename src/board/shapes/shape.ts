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
import type { Board } from "../index";

abstract class Shape implements ShapeProps {
   padding = 4;
   declare type: shapeType;
   declare id: string;
   declare board: Board;

   fill: string;
   height: number;
   width: number;
   left: number;
   rotate: number;
   stroke: string;
   top: number;
   ctx: CanvasRenderingContext2D;

   private eventListeners = new Map<ShapeEvent, Set<ShapeEventCallback>>();

   abstract draw(options: {
      active: boolean;
      ctx?: CanvasRenderingContext2D;
      addStyles?: boolean;
   }): void;
   abstract ID(): string;
   abstract IsResizable(p: Point): resizeDirection | null;
   abstract IsDraggable(p: Point): boolean;
   abstract Resize(current: Point, old: BoxInterface, d: resizeDirection): void;
   abstract mouseup(s: ShapeEventData): void;
   abstract mousedown(s: ShapeEventData): void;

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
}

export default Shape;
