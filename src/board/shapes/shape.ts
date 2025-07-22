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
   Identity,
} from "../types";
import { Box, type Board } from "../index";
import { IsIn } from "../utils/utilfunc";
import { resizeRect } from "../utils/resize";

export type DrawProps = {
   active: boolean;
   ctx?: CanvasRenderingContext2D;
   addStyles?: boolean;
   resize?: boolean;
};

const keysNotNeeded = ["ctx", "eventListeners"];

abstract class Shape implements ShapeProps {
   padding = 4;

   protected lastFlippedState: { x: boolean; y: boolean };
   declare type: shapeType;
   declare id: string;
   declare _board: Board;

   flipX: boolean;
   flipY: boolean;
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
   abstract clone(): Shape;
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
      _board,
      strokeWidth,
      scale,
      flipX,
      flipY,
   }: ShapeProps) {
      this.fill = fill || "#000000";
      this.height = height || 100;
      this.width = width || 100;
      this.left = left || 0;
      this.rotate = rotate || 0;
      this.stroke = stroke || "#FFFFFF";
      this.top = top || 0;
      this.ctx = ctx;
      this._board = _board;
      this.scale = scale || 1;
      this.strokeWidth = strokeWidth || 2;
      this.flipX = flipX || false;
      this.flipY = flipY || false;
      this.id = uuidv4();

      this.lastFlippedState = { x: false, y: false };
   }

   protected cloneProps(): ShapeProps {
      return {
         fill: this.fill,
         _board: this._board,
         ctx: this.ctx,
         flipX: this.flipX,
         flipY: this.flipY,
         left: this.left,
         top: this.top,
         height: this.height,
         width: this.width,
         rotate: this.rotate,
         scale: this.scale,
         stroke: this.stroke,
         strokeWidth: this.strokeWidth,
         id: uuidv4(),
         type: this.type,
      };
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
      const r = resizeRect(
         s.e.point,
         new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
         this.padding,
      );
      if (r) {
         switch (r.rd) {
            case "tl":
            case "br":
               document.body.style.cursor = "nwse-resize";
               break;

            case "tr":
            case "bl":
               document.body.style.cursor = "nesw-resize";
               break;

            case "t":
            case "b":
               document.body.style.cursor = "ns-resize";
               break;

            case "l":
            case "r":
               document.body.style.cursor = "ew-resize";
               break;
         }
      }

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

   getBounds() {
      return {
         x: this.left,
         y: this.top,
         width: this.width,
         height: this.height,
      };
   }

   toObject(): Identity<Shape> {
      const obj = {} as { [K in keyof this]: this[K] };
      for (const key of Object.keys(this) as Array<keyof this>) {
         if (
            !String(key).startsWith("_") &&
            !keysNotNeeded.includes(String(key))
         ) {
            obj[key] = this[key];
         }
      }
      return obj;
   }

   /**
    * @param {String|Object} key Property name or object (if object, iterate over the object properties)
    * @param {Object|Function} value Property value (if function, the value is passed into it and its return value is used as a new one)
    */
   set(key: string | Record<string, any>, value?: any) {
      if (typeof key === "object") {
         this._setObject(key);
      } else {
         this._set(key, value);
      }
      return this;
   }

   protected _set(key: string, value: any) {
      this[key as keyof this] = value;
   }

   protected _setObject(obj: Record<string, any>) {
      for (const prop in obj) {
         this._set(prop, obj[prop]);
      }
   }

   /**
    * Basic getter
    * @param {String} property Property name
    * @return {*} value of a property
    */
   get(property: string): any {
      return this[property as keyof this];
   }

   setCoords() {}
}

export default Shape;
