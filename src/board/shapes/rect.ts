import { Box, Pointer, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect, isDraggableWithRotation } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation, breakText } from "../utils/utilfunc";
import type { DrawProps } from "./shape";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";

type RectProps = {
   rx?: number;
   ry?: number;
};

class Rect extends Shape {
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

   constructor(props: ShapeProps & RectProps) {
      super({ ...props });
      this.rx = props.rx || 0;
      this.ry = props.ry || 0;

      this.type = "rect";
      this.verticalAlign = "center";
   }

   clone(): Shape {
      const props = this.cloneProps();
      return new Rect({ ...props, rx: this.rx, ry: this.ry });
   }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);
      return `<rect x="${this.left}" y="${this.top}" width="${this.width}" height="${this.height}" rx="${r}" ${attrs} />`;
   }

   getLocalPath(): Path2D {
      if (!this.cachedLocalPath) {
         this.cachedLocalPath = new Path2D();
         const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);
         this.cachedLocalPath.roundRect(0, 0, this.width, this.height, r);
      }
      return this.cachedLocalPath;
   }

   mousedown(s: ShapeEventData): void {
      super.mousedown(s);
   }

   mouseover(s: ShapeEventData): void {
      super.mouseover(s);
   }

   mouseup(s: ShapeEventData): void {
      super.set({
         width: Math.max(this.width, 20),
         height: Math.max(this.height, 20),
         locked: false,
      });
      super.mouseup(s);
   }

   IsDraggable(p: Pointer): boolean {
      // Use the rotation-aware draggable check utility
      const d = isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      });
      if (d) {
         this.set({
            locked: true,
         });
      }
      return d;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      // this.dragTarget(dx, dy);
      this.set({
         left: this.left += dx,
         top: this.top += dy,
      })

      return super.dragging(prev, current);
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
      // const d = resizeRect(
      //    calcPointWithRotation({ height, width, left, point: p, rotate, top }),
      //    new Box({
      //       x1: this.left,
      //       x2: this.left + this.width,
      //       y1: this.top,
      //       y2: this.top + this.height,
      //    }),
      //    this.padding,
      // );
      if (d) {
         return d.rd;
      }
      return null;
   }

   draw({ addStyles = true, ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      // const r = Math.min(this.rx || 0, this.ry || 0, this.width / 2, this.height / 2);

      context.save();

      // Get the current scale BEFORE applying rotation
      const currentScale = context.getTransform().a;

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();
      context.globalAlpha = this.opacity;

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.fillStyle = this.selectionFill;
         context.lineWidth = this.selectionStrokeWidth;
         context.setLineDash([
            this.selectionDash[0] / currentScale,
            this.selectionDash[1] / currentScale,
         ]);
         
         // Standard crisp rect for selection outline
         context.strokeRect(this.left, this.top, this.width, this.height);
         if (addStyles) context.fillRect(this.left, this.top, this.width, this.height);
      } else {
         // Generate Rough.js Drawable at (0, 0) ONCE to prevent 60fps vibration.
         // We only regenerate if any relevant property changes.
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
            
            // Only use roughjs if roughness > 0, otherwise draw crisp rect
            if (currentRoughness === 0) {
               this.roughDrawable = generator.rectangle(0, 0, this.width, this.height, {
                  ...roughOptions,
                  roughness: 0,
               });
            } else {
               this.roughDrawable = generator.rectangle(0, 0, this.width, this.height, {
                  ...roughOptions,
                  roughness: currentRoughness === 1 ? 1.5 : 3, // Artist = 1.5, Cartoonist = 3
                  seed: this.left + this.top // pseudo-random seed so it doesn't change
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
         // We must translate to this.left, this.top since the Drawable is at 0,0
         context.translate(this.left, this.top);

         // Context switching!
         // We grab whichever canvas element owns the current `context` (main, overlay, or offscreen export).
         const rc = rough.canvas(context.canvas as HTMLCanvasElement);
         rc.draw(this.roughDrawable);

         // Translate back so text renders at correct world coordinates
         context.translate(-this.left, -this.top);
      }

      context.closePath();
      if (this.text.length) {
         const t = breakText({
            ctx: context,
            text: this.text,
            width: this.width,
         }).join("\n");
         super.renderText({
            context,
            text: t,
         });
      }

      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      // New rotation-aware resize logic
      const newBounds = resizeWithRotation({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 20,
         minHeight: 20,
      });

      // Adjust height for text if needed
      const adjustedHeight = this.adjustHeight(newBounds.height);

      this.set({
         left: newBounds.left,
         top: newBounds.top,
         width: newBounds.width,
         height: adjustedHeight,
      })
      // this.setTarget({
      //    left: newBounds.left,
      //    top: newBounds.top,
      //    width: newBounds.width,
      //    height: adjustedHeight,
      // });

      return super.Resize(current, old, d);
   }
}

export default Rect;
