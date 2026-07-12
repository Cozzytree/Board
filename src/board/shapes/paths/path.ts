import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { DrawProps } from "../shape";
import { isDraggableWithRotation, resizeRect } from "../../utils/resize";
import Box from "@/board/utils/box";
import Shape from "@/board/shapes/shape";
import { setCoords, calcPointWithRotation } from "@/board/utils/utilfunc";
import { resizeWithRotationAndFlip } from "@/board/utils/resizeWithRotation";
import rough from "roughjs";
import type { Drawable } from "roughjs/bin/core";

export type PathProps = {
   points?: Point[];
   pathType?: string;
};

class Path extends Shape {
   private roughDrawable: Drawable | null = null;
   declare points: Point[];
   lastPoints: Point[];
   declare pathType: string;
   _cachedPath: Path2D | null = null;
   _cachedScale: number = 0;
   _cachedPointsLen: number = 0;
   protected lastRoughness: number | undefined = undefined;
   protected lastFillStyle: string | undefined = undefined;
   protected lastStroke: string | undefined = undefined;
   protected lastFill: string | undefined = undefined;
   protected lastStrokeWidth: number | undefined = undefined;
   protected lastDash0: number | undefined = undefined;
   protected lastDash1: number | undefined = undefined;
   protected lastRadius: number | undefined = undefined;

   constructor(props: ShapeProps & PathProps) {
      super(props);
      this.points = props.points || [];
      this.lastPoints = this.points.map((p) => {
         return { x: p.x, y: p.y };
      });
      this.type = "path";
      this.roughDrawable = null;
   }

   invalidateCache() {
      this._cachedPath = null;
      this._cachedScale = 0;
      this._cachedPointsLen = 0;
      this.roughDrawable = null;
   }

   set(key: string | Record<string, any>, value?: any) {
      let shouldInvalidate = false;
      const checkKey = (k: string) => {
         if (['points', 'width', 'height', 'flipX', 'flipY', 'strokeWidth'].includes(k)) {
            shouldInvalidate = true;
         }
      };

      if (typeof key === "object") {
         Object.keys(key).forEach(checkKey);
      } else {
         checkKey(key);
      }

      super.set(key, value);

      if (shouldInvalidate) {
         this.invalidateCache();
      }
      return this;
   }

   protected _set(key: string, value: any) {
      if (['points', 'width', 'height', 'flipX', 'flipY', 'strokeWidth'].includes(key)) {
         this.invalidateCache();
      }
      super._set(key, value);
   }

   setCoords(): void {
      const { box, points } = setCoords(this.points, this.left, this.top);
      this.set({
         points,
         left: box.x1,
         top: box.y1,
         width: box.x2 - box.x1,
         height: box.y2 - box.y1,
      });
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new Path({ ...props, points: this.points });
   }

   private getRoundedPolygonPath(points: [number, number][], radius: number): string {
      if (points.length < 3 || radius <= 0) {
         return `M ${points.map(p => `${p[0]} ${p[1]}`).join(" L ")} Z`;
      }
      
      let path = "";
      const len = points.length;
      for (let i = 0; i < len; i++) {
         const p1 = points[(i - 1 + len) % len];
         const p2 = points[i];
         const p3 = points[(i + 1) % len];
         
         const d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
         const d2 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
         
         const r = Math.min(radius, d1 / 2, d2 / 2);
         
         if (r === 0) {
            path += (i === 0 ? "M " : " L ") + `${p2[0]} ${p2[1]}`;
            continue;
         }
         
         const u1 = [(p1[0] - p2[0]) / d1, (p1[1] - p2[1]) / d1];
         const u2 = [(p3[0] - p2[0]) / d2, (p3[1] - p2[1]) / d2];
         
         const startX = p2[0] + u1[0] * r;
         const startY = p2[1] + u1[1] * r;
         const endX = p2[0] + u2[0] * r;
         const endY = p2[1] + u2[1] * r;
         
         if (i === 0) {
            path += `M ${startX} ${startY}`;
         } else {
            path += ` L ${startX} ${startY}`;
         }
         
         path += ` Q ${p2[0]} ${p2[1]} ${endX} ${endY}`;
      }
      path += " Z";
      return path;
   }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      if (this.points.length < 2) return "";

      const worldPoints = this.points.map((point) => {
         let x = point.x;
         let y = point.y;
         if (this.flipX) x = this.width - x;
         if (this.flipY) y = this.height - y;
         return [this.left + x, this.top + y] as [number, number];
      });
      const d = this.getRoundedPolygonPath(worldPoints, this.radius || 0);

      return `<path d="${d}" ${attrs} />`;
   }

   getLocalPath(): Path2D {
      if (!this.cachedLocalPath) {
         const transformedPoints = this.points.map((point) => {
            let x = point.x;
            let y = point.y;
            if (this.flipX) x = this.width - x;
            if (this.flipY) y = this.height - y;
            return [x, y] as [number, number];
         });
         const pathStr = this.getRoundedPolygonPath(transformedPoints, this.radius || 0);
         this.cachedLocalPath = new Path2D(pathStr);
      }
      return this.cachedLocalPath;
   }

   mouseup(s: ShapeEventData): void {
      this.lastPoints = [];
      super.set("lastFlippedState", {
         x: super.get("flipX"),
         y: super.get("flipY"),
      });
      this.setCoords();
      super.mouseup(s);
   }

   IsDraggable(p: Point): boolean {
      return isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      });
   }

   draw({ ctx, addStyles = true, resize }: DrawProps): void {
      if (this.points.length < 2) return;
      const context = ctx || this.ctx;

      const currentScale = context.getTransform().a;
      
      const currentRoughness = this.roughness ?? 1;
      const currentFillStyle = this.fillStyle || "hachure";
      const currentFill = this.fill !== "transparent" && this.fill !== "#00000000" ? this.fill : undefined;
      const dash0 = this.dash?.[0] || 0;
      const dash1 = this.dash?.[1] || 0;

      const currentRadius = this.radius || 0;

      const transformedPoints = this.points.map((point) => {
         let x = point.x;
         let y = point.y;
         if (this.flipX) x = this.width - x;
         if (this.flipY) y = this.height - y;
         return [x, y] as [number, number];
      });

      if (
         (!this.roughDrawable && currentRoughness > 0) ||
         this._cachedPointsLen !== this.points.length ||
         currentRoughness !== this.lastRoughness ||
         currentFillStyle !== this.lastFillStyle ||
         this.stroke !== this.lastStroke ||
         currentFill !== this.lastFill ||
         this.strokeWidth !== this.lastStrokeWidth ||
         dash0 !== this.lastDash0 ||
         dash1 !== this.lastDash1 ||
         currentRadius !== this.lastRadius
      ) {
         this._cachedPointsLen = this.points.length;
         this.lastRoughness = currentRoughness;
         this.lastFillStyle = currentFillStyle;
         this.lastStroke = this.stroke;
         this.lastFill = currentFill;
         this.lastStrokeWidth = this.strokeWidth;
         this.lastDash0 = dash0;
         this.lastDash1 = dash1;
         this.lastRadius = currentRadius;

         const generator = rough.generator();
         const roughOptions: any = {
            stroke: this.stroke,
            fill: currentFill,
            strokeWidth: this.strokeWidth,
            fillStyle: currentFillStyle,
         };
         if (dash0 > 0 || dash1 > 0) roughOptions.strokeLineDash = [dash0, dash1];
         
         const roughnessOpt = currentRoughness === 0 ? 0 : (currentRoughness === 1 ? 1.5 : 3);
         const seedOpt = currentRoughness === 0 ? undefined : this.left + this.top;

         if (currentRadius > 0) {
            const pathStr = this.getRoundedPolygonPath(transformedPoints, currentRadius);
            this.roughDrawable = generator.path(pathStr, {
               ...roughOptions,
               roughness: roughnessOpt,
               seed: seedOpt
            });
         } else {
            this.roughDrawable = generator.polygon(transformedPoints, {
               ...roughOptions,
               roughness: roughnessOpt,
               seed: seedOpt
            });
         }
      }

      context.save();

      // Rotation logic
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      context.save(); // Inner save for path transforms
      context.translate(this.left, this.top);
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
         
         context.scale(this.scale, this.scale);
         
         const pathStr = this.getRoundedPolygonPath(transformedPoints, currentRadius);
         const p2d = new Path2D(pathStr);
         
         if (addStyles) context.fill(p2d);
         context.stroke(p2d);
      } else {
         if (this.roughDrawable) {
            const rc = rough.canvas(context.canvas as HTMLCanvasElement);
            rc.draw(this.roughDrawable);
         }
      }

      context.restore(); // Restore inner path transforms

      if (this.text.length) {
         super.renderText({ context });
      }
      
      context.restore(); // Restore outer rotation
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      const localBox = new Box({
         x1: -halfW,
         x2: halfW,
         y1: -halfH,
         y2: halfH,
      });

      const rs = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );
      if (rs) {
         this.lastPoints = this.points.map((p) => ({ x: p.x, y: p.y }));
         return rs.rd;
      }
      return null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      const newBounds = resizeWithRotationAndFlip({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 20,
         minHeight: 20
      });

      const newWidth = newBounds.width;
      const newHeight = this.adjustHeight(newBounds.height);

      const centerX = old.x1 + (old.x2 - old.x1) / 2;
      const centerY = old.y1 + (old.y2 - old.y1) / 2;
      const dx = current.x - centerX;
      const dy = current.y - centerY;
      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // Local bounds of old shape
      const halfW = (old.x2 - old.x1) / 2;
      const halfH = (old.y2 - old.y1) / 2;

      let flipX = this.lastFlippedState.x;
      let flipY = this.lastFlippedState.y;

      switch (d) {
         case "l":
         case "bl":
         case "tl":
            // Moving left handle. Fixed is right edge (halfW).
            // If localX > halfW, we flipped.
            flipX = this.lastFlippedState.x ? localX < halfW : localX > halfW;
            break;
         case "r":
         case "br":
         case "tr":
            // Moving right handle. Fixed is left edge (-halfW).
            // If localX < -halfW, we flipped.
            flipX = this.lastFlippedState.x ? localX > -halfW : localX < -halfW;
            break;
      }

      switch (d) {
         case "t":
         case "tr":
         case "tl":
            // Moving top. Fixed is bottom (halfH).
            flipY = this.lastFlippedState.y ? localY < halfH : localY > halfH;
            break;
         case "b":
         case "br":
         case "bl":
            // Moving bottom. Fixed is top (-halfH).
            flipY = this.lastFlippedState.y ? localY > -halfH : localY < -halfH;
            break;
      }

      const oldWidth = old.x2 - old.x1;
      const oldHeight = old.y2 - old.y1;

      this.points.forEach((p, i) => {
         const original = this.lastPoints[i];
         // % within the box / newVal
         const scaledX = (original.x / oldWidth) * newWidth;
         const scaledY = (original.y / oldHeight) * newHeight;
         p.x = scaledX;
         p.y = scaledY;
      });

     this.setTarget({
         left: newBounds.left,
         top: newBounds.top,
         width: newWidth,
         height: newHeight,
     })
      super.setSilent({
         flipX,
         flipY,
      });

      this.invalidateCache();

      return super.Resize(current, old, d);
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.dragInstant(dx, dy);

      return super.dragging(prev, current);
   }
}

export default Path;
