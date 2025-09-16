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
   textAlign,
} from "../types";
import { Box, type Board } from "../index";
import { IsIn } from "../utils/utilfunc";
import { resizeRect } from "../utils/resize";
import type { connectionEventData, ConnectionInterface, Side } from "./shape_types";
import Connections from "../connections";
import { HoveredColor, LINE_CONNECTION_PADDING } from "../constants";

export type DrawProps = {
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
   declare selectionAlpha: number;
   declare selectionDash: [number, number];
   declare selectionColor: string;
   declare selectionFill: string;
   declare selectionStrokeWidth: number;

   fontWeight: number;
   verticalAlign: "top" | "center" | "bottom";
   textAlign: textAlign;
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
   dash: [number, number];
   text: string;
   fontSize: number;
   connections: ConnectionInterface;

   private eventListeners = new Map<ShapeEvent, Set<ShapeEventCallback>>();

   abstract draw(options: DrawProps): void;
   abstract IsResizable(p: Point): resizeDirection | null;
   abstract IsDraggable(p: Point): boolean;
   abstract clone(): Shape;
   // abstract connectionEvent(e: connectionEventData): void;

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
      dash,
      text,
      fontSize,
      verticalAlign,
      textAlign,
      connections,
      selectionColor,
      selectionDash,
      selectionAlpha,
      selectionFill,
      selectionStrokeWidth,
   }: ShapeProps) {
      this.fill = fill || "#00000000";
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
      this.dash = dash || [0, 0];
      this.text = text || "";
      this.fontSize = fontSize || 20;
      this.verticalAlign = verticalAlign || "center";
      this.fontWeight = 500;
      this.textAlign = textAlign || "center";
      this.connections = connections || new Connections();
      this.id = uuidv4();
      this.selectionColor = selectionColor || HoveredColor;
      this.selectionStrokeWidth = selectionStrokeWidth || 2;
      this.selectionAlpha = selectionAlpha || 0.4;
      this.selectionDash = selectionDash || [0, 0];
      this.selectionFill = selectionFill || "#20202050";

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
         text: this.text,
         dash: this.dash,
         fontSize: this.fontSize,
         textAlign: this.textAlign,
         verticalAlign: this.verticalAlign,
      };
   }

   connectionEvent(_: connectionEventData) {}

   dragging(_: Point, current: Point): Shape[] | void {
      if (this.connections) {
         const s: Shape[] = [];
         this.connections.forEach((c) => {
            s.push(c.s);
            c.s.connectionEvent({ s: this, c, p: current });
            return false;
         });

         return s;
      }
   }

   Resize(current: Point, _old: BoxInterface, _: resizeDirection): Shape[] | void {
      if (this.connections) {
         const s: Shape[] = [];
         this.connections.forEach((c) => {
            s.push(c.s);
            c.s.connectionEvent({ s: this, c, p: current });
            return false;
         });

         return s;
      }
   }

   activeRect(ctx?: CanvasRenderingContext2D) {
      const context = ctx || this.ctx;
      const pad = 2;
      const x = this.left - pad;
      const y = this.top - pad;
      const w = this.width + pad * 2;
      const h = this.height + pad * 2;

      // Compute actual uniform scale
      const transform = context.getTransform();
      const currentScale = Math.sqrt(transform.a ** 2 + transform.b ** 2);

      context.save();

      // Apply rotation around center
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      // Draw outer rectangle with constant visual width
      context.beginPath();
      context.strokeStyle = this.selectionColor;
      context.lineWidth = this.strokeWidth / currentScale; // Adjust for scale
      context.rect(x, y, w, h);
      context.stroke();
      context.closePath();

      // Corner dot size in screen pixels
      const screenDotSize = 6;
      const drawDot = (cx: number, cy: number) => {
         const wh = screenDotSize / currentScale; // Inverse scale for visual consistency
         context.beginPath();
         context.fillStyle = this._board.background;
         context.strokeStyle = this.selectionColor;
         context.lineWidth = this.selectionStrokeWidth / currentScale; // Keep dot border consistent too
         context.roundRect(cx - wh / 2, cy - wh / 2, wh, wh, 0);
         context.stroke();
         context.fill();
         context.closePath();
      };

      drawDot(x, y); // top-left
      drawDot(x + w, y); // top-right
      drawDot(x, y + h); // bottom-left
      drawDot(x + w, y + h); // bottom-right

      context.restore();
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
      this.connections.forEach((c) => {
         c.s.setCoords();
      });
      this.emit("mouseup", s);
   }

   mouseover(s: ShapeEventData): void {
      if (this._board.activeShapes.has(this)) {
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
         } else {
            document.body.style.cursor = "default";
         }
      } else {
         document.body.style.cursor = "default";
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
         if (!String(key).startsWith("_") && !keysNotNeeded.includes(String(key))) {
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
      if (typeof value === "function") {
         value = value();
      }
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

   inAnchor(p: Point): { isin: boolean; side: Side; point: Point } {
      const inSetX = Math.floor(this.width * 0.2);
      const inSetY = Math.floor(this.height * 0.2);
      const inner = new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 });
      const points: { p: Point; cond: Box; side: Side }[] = [
         {
            cond: new Box({
               x1: this.left - inSetX,
               x2: this.left + inSetX,
               y1: this.top + this.height * 0.5 - inSetY,
               y2: this.top + this.height * 0.5 + inSetY,
            }),
            p: { x: this.left, y: this.top + this.height * 0.5 },
            side: "left",
         },
         {
            cond: new Box({
               x1: this.left + this.width * 0.5 - inSetX,
               x2: this.left + this.width * 0.5 + inSetX,
               y1: this.top - inSetX,
               y2: this.top + inSetY,
            }),
            p: { x: this.left + this.width * 0.5, y: this.top },
            side: "top",
         },
         {
            cond: new Box({
               x1: this.left + this.width - inSetX,
               x2: this.left + this.width + inSetX,
               y1: this.top + this.height * 0.5 - inSetY,
               y2: this.top + this.height * 0.5 + inSetY,
            }),
            p: { x: this.left + this.width, y: this.top + this.height * 0.5 },
            side: "right",
         },
         {
            cond: new Box({
               x1: this.left + this.width * 0.5 - inSetX,
               x2: this.left + this.width * 0.5 + inSetX,
               y1: this.top + this.height - inSetY,
               y2: this.top + this.height + inSetY,
            }),
            p: { x: this.left + this.width * 0.5, y: this.top + this.height },
            side: "bottom",
         },
      ];

      for (let i = 0; i < points.length; i++) {
         const p = points[i].cond;
         if (
            IsIn({
               inner,
               outer: new Box({
                  x1: p.x1 - LINE_CONNECTION_PADDING,
                  y1: p.y1 - LINE_CONNECTION_PADDING,
                  x2: p.x2 + LINE_CONNECTION_PADDING,
                  y2: p.y2 + LINE_CONNECTION_PADDING,
               }),
            })
         ) {
            return { isin: true, side: points[i].side, point: points[i].p };
         }
      }

      return { isin: false, side: "top", point: { x: 0, y: 0 } };
   }

   protected renderText({ context, text }: { text?: string; context: CanvasRenderingContext2D }) {
      // text
      // const mesureText = context.measureText("Hello world");
      const texts = text?.split("\n") || this.text.split("\n");
      context.fillStyle = "white";
      if (this.textAlign === "center") {
         context.textAlign = "center";
      } else if (this.textAlign === "left") {
         context.textAlign = "left";
      } else {
         context.textAlign = "left";
      }

      context.textBaseline = "middle";
      context.font = `${this.fontWeight} ${this.fontSize}px system-ui`;

      // Measure the height of one line (using fontSize * lineHeight ratio, or estimate)
      const lineHeight = this.fontSize * 1.2; // adjust multiplier as needed
      const totalHeight = texts.length * lineHeight;

      // Compute starting y-point: center of the shape
      const centerY = this.top + this.height * 0.5;
      // First line's baseline
      let y: number;
      if (this.verticalAlign === "top") {
         y = this.top + lineHeight * 0.8;
      } else if (this.verticalAlign === "center") {
         y = centerY - totalHeight / 2 + lineHeight / 2;
      } else {
         y = this.top + this.height - totalHeight;
      }

      texts.forEach((t) => {
         let x: number;
         if (this.textAlign === "left") {
            x = this.left + this.padding;
         } else if (this.textAlign === "center") {
            x = this.left + this.width * 0.5;
         } else {
            const size = context.measureText(t);
            x = this.left + this.width - size.width - this.padding;
         }
         context.fillText(t, x, y);
         y += lineHeight;
      });
   }
}

export default Shape;
