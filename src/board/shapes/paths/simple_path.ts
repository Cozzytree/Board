import type { Point, ShapeProps } from "@/board/types";
import Path, { type PathProps } from "./path";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import getStroke from "perfect-freehand";
import { isDraggableWithRotation } from "@/board/utils/resize";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";

// flipX formula
// left + width - this.left + p.x (flipped)

class SimplePath extends Path {
   private simpleRoughDrawable: Drawable | null = null;

   constructor(props: ShapeProps & PathProps) {
      super({ ...props });
      this.pathType = "simplePath";
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new SimplePath({ ...props, points: this.points });
   }

   scaleShape(): void { }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      if (this.points.length < 2) return "";

      const transformedPoints = this.points.map((point) => {
         let x = point.x;
         let y = point.y;
         if (this.flipX) x = this.width - x;
         if (this.flipY) y = this.height - y;
         return [x, y, 0.5] as [number, number, number];
      });

      const stroke = getStroke(transformedPoints, {
         size: this.strokeWidth,
         thinning: 0.1,
         smoothing: 3,
         streamline: 0.1,
         easing: (t) => t,
         start: { taper: 0, cap: true },
         end: { taper: 0, cap: true },
      });

      if (stroke.length === 0) return "";

      let d = `M ${stroke[0][0]} ${stroke[0][1]} `;
      for (let i = 1; i < stroke.length - 1; i++) {
         const pt = stroke[i];
         const nextPt = stroke[i + 1];
         const midX = (pt[0] + nextPt[0]) / 2;
         const midY = (pt[1] + nextPt[1]) / 2;
         d += `Q ${pt[0]} ${pt[1]}, ${midX} ${midY} `;
      }
      d += "Z";

      // Since stroke generates an outline, we use fill, not stroke!
      // But we need to use the shape's stroke color as the fill, because it's a line.
      const fillColor = this.stroke === "transparent" ? "none" : this.stroke;

      // We already handled scale/rotate/flip in getSvgAttributes()
      // but the path coordinates are relative to the shape's top-left, so we need to translate by (left, top)
      // Actually, getSvgAttributes() returns transform="rotate(..) translate(..) scale(..) translate(..)" which operates ON TOP of the raw SVG node.
      // If the path is drawn from 0,0 relative to the shape, we just need to translate by this.left, this.top.
      // Let's wrap it in a group.
      return `<g ${attrs}><path d="${d}" fill="${fillColor}" stroke="none" transform="translate(${this.left}, ${this.top})" /></g>`;
   }

   draw({ ctx, resize }: DrawProps): void {
      const context = ctx || this.ctx;

      if (this.points.length < 2) return;

      const currentScale = context.getTransform().a;

      const currentRoughness = this.roughness ?? 1;
      const dash0 = this.dash?.[0] || 0;
      const dash1 = this.dash?.[1] || 0;

      if (
         (!this._cachedPath && !this.simpleRoughDrawable) ||
         this._cachedScale !== currentScale ||
         this._cachedPointsLen !== this.points.length ||
         currentRoughness !== this.lastRoughness ||
         this.stroke !== this.lastStroke ||
         this.strokeWidth !== this.lastStrokeWidth ||
         dash0 !== this.lastDash0 ||
         dash1 !== this.lastDash1
      ) {
         this._cachedScale = currentScale;
         this._cachedPointsLen = this.points.length;
         this.lastRoughness = currentRoughness;
         this.lastStroke = this.stroke;
         this.lastStrokeWidth = this.strokeWidth;
         this.lastDash0 = dash0;
         this.lastDash1 = dash1;

         // Transform points based on flip settings
         const transformedPointsForPerfect = this.points.map((point) => {
            let x = point.x;
            let y = point.y;
            if (this.flipX) x = this.width - x;
            if (this.flipY) y = this.height - y;
            return [x, y, 0.5] as [number, number, number]; // [x, y, pressure]
         });

         const transformedPointsForRough = this.points.map((point) => {
            let x = point.x;
            let y = point.y;
            if (this.flipX) x = this.width - x;
            if (this.flipY) y = this.height - y;
            return [x, y] as [number, number];
         });

         if (currentRoughness > 0) {
            const generator = rough.generator();
            const roughOptions: any = {
               stroke: this.stroke,
               strokeWidth: this.strokeWidth,
               roughness: currentRoughness === 1 ? 1.5 : 3,
               seed: this.left + this.top // pseudo-random seed
            };
            if (dash0 > 0 || dash1 > 0) roughOptions.strokeLineDash = [dash0, dash1];
            
            this.simpleRoughDrawable = generator.curve(transformedPointsForRough, roughOptions);
            this._cachedPath = null;
         } else {
            this.simpleRoughDrawable = null;
            // Get smooth stroke outline from perfect-freehand
            const stroke = getStroke(transformedPointsForPerfect, {
               size: (resize ? 3 : this.strokeWidth) / currentScale,
               thinning: 0.1,
               smoothing: 3,
               streamline: 0.1,
               easing: (t) => t,
               start: { taper: 0, cap: true },
               end: { taper: 0, cap: true },
            });

            const p = new Path2D();
            if (stroke.length > 0) {
               p.moveTo(stroke[0][0], stroke[0][1]);
               for (let i = 1; i < stroke.length - 1; i++) {
                  const pt = stroke[i];
                  const nextPt = stroke[i + 1];
                  const midX = (pt[0] + nextPt[0]) / 2;
                  const midY = (pt[1] + nextPt[1]) / 2;
                  p.quadraticCurveTo(pt[0], pt[1], midX, midY);
               }
               p.closePath();
            }
            this._cachedPath = p;
         }
      }

      context.save();

      // Rotation logic
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      context.translate(this.left, this.top);
      context.globalAlpha = this.opacity;

      if (this.simpleRoughDrawable && !resize) {
         const rc = rough.canvas(context.canvas as HTMLCanvasElement);
         rc.draw(this.simpleRoughDrawable);
      } else if (this._cachedPath) {
         // Fill the stroke path with the stroke color
         context.fillStyle = resize ? "#808080" : this.stroke;
         context.fill(this._cachedPath);
      }

      context.restore();
   }

   IsDraggable(p: Point): boolean {
      return isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      })
      // return IsIn({
      //    inner: new Box({ x1: p.x, y1: p.y, x2: p.x + 1, y2: p.y + 1 }),
      //    outer: new Box({
      //       x1: this.left,
      //       y1: this.top,
      //       x2: this.left + this.width,
      //       y2: this.top + this.height,
      //    }),
      // });
   }

   dragging(current: Point, prev: Point): void {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.left -= dx;
      this.top -= dy;
   }
}

export default SimplePath;
