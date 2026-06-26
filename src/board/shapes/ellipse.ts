import { Box, Pointer, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect } from "../utils/resize";
import { breakText, calcPointWithRotation } from "../utils/utilfunc";
import type { DrawProps } from "./shape";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";

type EllipseProps = {
   rx?: number;
   ry?: number;
};

class Ellipse extends Shape {
   declare rx: number;
   declare ry: number;
   private roughDrawable: Drawable | null = null;
   private lastWidth: number = 0;
   private lastHeight: number = 0;
   private lastRoughness: number | undefined = undefined;
   private lastFillStyle: string | undefined = undefined;
   private lastStroke: string | undefined = undefined;
   private lastFill: string | undefined = undefined;
   private lastStrokeWidth: number | undefined = undefined;
   private lastDash0: number | undefined = undefined;
   private lastDash1: number | undefined = undefined;

   constructor(props: ShapeProps & EllipseProps) {
      super(props);
      this.rx = props.rx || 10;
      this.ry = props.ry || 10;
      this.width = this.rx * 2;
      this.height = this.ry * 2;

      this.type = "ellipse";
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Ellipse({ ...props, rx: this.rx, ry: this.ry });
   }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      const cx = this.left + this.width / 2;
      const cy = this.top + this.height / 2;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${this.width / 2}" ry="${this.height / 2}" ${attrs} />`;
   }

   getLocalPath(): Path2D {
      if (!this.cachedLocalPath) {
         this.cachedLocalPath = new Path2D();
         this.cachedLocalPath.ellipse(this.rx, this.ry, this.rx, this.ry, 0, 0, Math.PI * 2);
      }
      return this.cachedLocalPath;
   }

   IsDraggable(p: Pointer): boolean {
      // Use the rotation-aware draggable check utility

      const centerX = this.left + this.width / 2;
      const centerY = this.top + this.height / 2;

      const dx = p.x - centerX;
      const dy = p.y - centerY;

      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);

      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // 3. Check against unrotated rect bounds
      const halfW = this.width / 2;
      const halfH = this.height / 2;

      const d = localX > -halfW && localX < halfW && localY > -halfH && localY < halfH;
      if (d) {
         this.set("locked", true);
      }
      return d;
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const localBox = new Box({
         x1: -width / 2,
         x2: width / 2,
         y1: -height / 2,
         y2: height / 2,
      });
      const d = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );

      if (d) {
         return d.rd;
      }
      return null;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      // this.left += dx;
      // this.top += dy;
      this.dragInstant(dx, dy);

      return super.dragging(prev, current);
   }

   mouseup(s: ShapeEventData): void {
      super.set({
         width: this.rx * 2,
         height: this.ry * 2,
      });
      super.mouseup(s);
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
               this._board.setCursor("nwse-resize");
               break;

            case "tr":
            case "bl":
               this._board.setCursor("nesw-resize");
               break;

            case "t":
            case "b":
               this._board.setCursor("ns-resize");
               break;

            case "l":
            case "r":
               this._board.setCursor("ew-resize");
               break;
         }
      }

      this.emit("mouseover", s);
   }

   draw({ addStyles = true, ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      context.save();
      context.beginPath();

      const currentScale = context.getTransform().a;

      const centerX = this.left + this.rx;
      const centerY = this.top + this.ry;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.globalAlpha = this.opacity;

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.fillStyle = this.selectionFill;
         context.lineWidth = this.selectionStrokeWidth / currentScale;
         context.setLineDash([
            this.selectionDash[0] / currentScale,
            this.selectionDash[1] / currentScale,
         ]);
         
         context.beginPath();
         context.ellipse(this.left + this.rx, this.top + this.ry, this.rx, this.ry, 0, 0, Math.PI * 2);
         if (addStyles) context.fill();
         context.stroke();
         context.closePath();
      } else {
         const currentRoughness = this.roughness ?? 1;
         const currentFillStyle = this.fillStyle || "hachure";
         const currentFill = this.fill !== "transparent" && this.fill !== "#00000000" ? this.fill : undefined;
         const dash0 = this.dash?.[0] || 0;
         const dash1 = this.dash?.[1] || 0;
         
         if (
            !this.roughDrawable || 
            this.width !== this.lastWidth || 
            this.height !== this.lastHeight || 
            currentRoughness !== this.lastRoughness || 
            currentFillStyle !== this.lastFillStyle ||
            this.stroke !== this.lastStroke ||
            currentFill !== this.lastFill ||
            this.strokeWidth !== this.lastStrokeWidth ||
            dash0 !== this.lastDash0 ||
            dash1 !== this.lastDash1
         ) {
            const generator = rough.generator();
            const roughOptions: any = {
               stroke: this.stroke,
               fill: currentFill,
               strokeWidth: this.strokeWidth,
               fillStyle: currentFillStyle,
            };
            
            if (dash0 > 0 || dash1 > 0) {
               roughOptions.strokeLineDash = [dash0, dash1];
            }
            
            if (currentRoughness === 0) {
               this.roughDrawable = generator.ellipse(0, 0, this.width, this.height, {
                  ...roughOptions,
                  roughness: 0,
               });
            } else {
               this.roughDrawable = generator.ellipse(0, 0, this.width, this.height, {
                  ...roughOptions,
                  roughness: currentRoughness === 1 ? 1.5 : 3,
                  seed: this.left + this.top
               });
            }
            this.lastWidth = this.width;
            this.lastHeight = this.height;
            this.lastRoughness = currentRoughness;
            this.lastFillStyle = currentFillStyle;
            this.lastStroke = this.stroke;
            this.lastFill = currentFill;
            this.lastStrokeWidth = this.strokeWidth;
            this.lastDash0 = dash0;
            this.lastDash1 = dash1;
         }

         context.translate(this.left + this.rx, this.top + this.ry);
         const rc = rough.canvas(context.canvas as HTMLCanvasElement);
         rc.draw(this.roughDrawable);
         context.translate(-(this.left + this.rx), -(this.top + this.ry));
      }

      if (this.text.length) {
         super.renderText({
            context,
            text: breakText({ ctx: context, text: this.text, width: this.width }).join("\n"),
         });
      }

      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): void {
      // const oldX1 = old.x1 - this.rx;
      // const oldX2 = old.x1 + this.rx;
      // const oldY1 = old.y1 - this.ry;
      // const oldY2 = old.y2 + this.ry;

      // centered resize
      // this.rx = Math.max(Math.abs(Math.abs(current.x - old.x1) / 2), 5);
      // this.ry = Math.max(Math.abs(Math.abs(current.y - old.y1) / 2), 5);

      switch (d) {
         case "t":
            if (current.y > old.y2) {
               super.set({
                  top: old.y2,
                  height: this.adjustHeight(current.y - old.y2),
               });
            } else {
               super.set({
                  top: current.y,
                  height: this.adjustHeight(old.y2 - current.y),
               });
            }
            break;
         case "b":
            if (current.y > old.y1) {
               super.set({
                  top: old.y1,
                  height: this.adjustHeight(current.y - old.y1),
               });
            } else {
               super.set({
                  top: current.y,
                  height: this.adjustHeight(old.y2 - current.y),
               });
            }
            break;
         case "l":
            if (current.x > old.x2) {
               super.set({
                  left: old.x2,
                  width: current.x - old.x2,
               });
            } else {
               super.set({
                  left: current.x,
                  width: old.x2 - current.x,
               });
            }
            break;
         case "r":
            if (current.x > old.x1) {
               super.set({
                  left: old.x1,
                  width: current.x - old.x1,
               });
            } else {
               super.setSilent({
                  left: current.x,
                  width: old.x1 - current.x,
               });
            }
            break;
         case "tl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "tr":
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "br":
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
            break;
         case "bl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }
            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
      }

      super.set({
         rx: this.width / 2,
         ry: this.height / 2,
      })
   }

   _set(key: string, value: any) {
      super._set(key, value);
      switch (key) {
         case "rx":
            this.rx = value;
            this.set("width", value * 2);
            break;

         case "ry":
            this.ry = value;
            this.set("height", value * 2);
            break;
      }
      return this;
   }
}

export default Ellipse;
