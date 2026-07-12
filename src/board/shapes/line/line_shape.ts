import Line from "./line";
import type { ShapeProps, Point, resizeDirection, BoxInterface } from "../../types";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import type { LineProps, connectionEventData, Side } from "../shape_types";
import rough from "roughjs";
import { rotatePoint } from "@/board/utils/utilfunc";
import { INDICATOR_COLOR } from "../../constants";
import type { Drawable } from "roughjs/bin/core";

export type LineShapeProps = {
   linetype?: "curved" | "straight" | "anchor";
   arrow?: { star: boolean; end: boolean };
   arrowtype?: "full" | "filled";
   attached?: boolean;
   lineshape?: boolean;
}

class LineShape extends Line {
   public attached: boolean;
   public linetype: "curved" | "straight" | "anchor" = "straight";
   public arrowtype: "full" | "filled" = "full";
   public lineshape: boolean = true;

   private roughDrawable: Drawable | null = null;
   private _cachedPathStr: string | null = null;
   private lastRoughness: number | undefined = undefined;
   private lastFill: string | undefined = undefined;

   constructor(props: ShapeProps & LineShapeProps & LineProps) {
      super({ ...props, lineType: props.linetype || "straight" });
      this.attached = props.attached || false;
      if (props.linetype) this.linetype = props.linetype;
      if (props.arrow) {
         this.arrowS = props.arrow.star;
         this.arrowE = props.arrow.end;
      }
      if (props.arrowtype) this.arrowtype = props.arrowtype;
      // type stays "line" from Line's constructor
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new LineShape({
         ...props,
         points: this.points.map(p => ({ x: p.x, y: p.y })),
         linetype: this.linetype,
         arrow: { star: this.arrowS, end: this.arrowE },
         arrowtype: this.arrowtype,
         attached: this.attached,
      });
   }

   // --- SVG Path Generation ---
   private getSvgPathString(): string {
      if (this.points.length === 0) return "";
      let d = `M ${this.points[0].x} ${this.points[0].y}`;
      if (this.linetype === "curved" && this.points.length > 2) {
         for (let i = 0; i < this.points.length - 1; i++) {
            const p0 = i > 0 ? this.points[i - 1] : (this.attached ? this.points[this.points.length - 1] : this.points[0]);
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            const p3 = i !== this.points.length - 2 ? this.points[i + 2] : (this.attached ? this.points[0] : p2);

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
         }
         if (this.attached) {
            const p0 = this.points[this.points.length - 2];
            const p1 = this.points[this.points.length - 1];
            const p2 = this.points[0];
            const p3 = this.points[1];
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
         }
      } else if (this.linetype === "anchor") {
         for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];
            const midX = (prev.x + curr.x) / 2;
            d += ` L ${midX} ${prev.y} L ${midX} ${curr.y} L ${curr.x} ${curr.y}`;
         }
         if (this.attached) {
            const prev = this.points[this.points.length - 1];
            const curr = this.points[0];
            const midX = (prev.x + curr.x) / 2;
            d += ` L ${midX} ${prev.y} L ${midX} ${curr.y} L ${curr.x} ${curr.y}`;
         }
      } else {
         for (let i = 1; i < this.points.length; i++) {
            d += ` L ${this.points[i].x} ${this.points[i].y}`;
         }
         if (this.attached) {
            d += ` Z`;
         }
      }
      return d;
   }

   // --- Rendering ---
   draw({ ctx, resize }: DrawProps): void {
      if (this.points.length < 2) return;
      const context = ctx || this.ctx;

      const pathStr = this.getSvgPathString();

      const currentRoughness = this.roughness ?? 1;
      const currentFillStyle = this.fillStyle || "hachure";
      const currentFill = this.fill !== "transparent" && this.fill !== "#00000000" && this.attached ? this.fill : undefined;

      if (!this.roughDrawable ||
         this._cachedPathStr !== pathStr ||
         this.lastRoughness !== currentRoughness ||
         this.lastFill !== currentFill
      ) {
         const generator = rough.generator();
         const roughOptions: any = {
            stroke: this.stroke,
            strokeWidth: this.strokeWidth,
            fill: currentFill,
            fillStyle: currentFillStyle,
            roughness: currentRoughness === 0 ? 0 : (currentRoughness === 1 ? 1 : 2),
            disableMultiStroke: true,
            preserveVertices: true,
         };
         if (this.dash?.[0] > 0) roughOptions.strokeLineDash = this.dash;
         if (currentRoughness > 0) roughOptions.seed = this.left + this.top;

         this.roughDrawable = generator.path(pathStr, roughOptions);
         this._cachedPathStr = pathStr;
         this.lastRoughness = currentRoughness;
         this.lastFill = currentFill;
      }

      context.save();
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.translate(this.left, this.top);
      context.globalAlpha = this.opacity;

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         const p2d = new Path2D(pathStr);
         context.strokeStyle = this.selectionColor;
         context.lineWidth = this.selectionStrokeWidth;
         context.stroke(p2d);
         if (currentFill) {
            context.fillStyle = this.selectionFill;
            context.fill(p2d);
         }
      } else if (this.roughDrawable) {
         const rc = rough.canvas(context.canvas as HTMLCanvasElement);
         rc.draw(this.roughDrawable);
      }

      // Arrowheads (only for open lines)
      if (!this.attached) {
         if (this.arrowS) {
            this.renderArrowhead(context, 1, 0, this.arrowtype === "filled");
         }
         if (this.arrowE) {
            this.renderArrowhead(context, this.points.length - 2, this.points.length - 1, this.arrowtype === "filled");
         }
      }

      context.restore();
   }

   private renderArrowhead(context: CanvasRenderingContext2D, fromIdx: number, toIdx: number, filled: boolean) {
      if (this.points.length < 2) return;
      const p1 = this.points[fromIdx];
      const p2 = this.points[toIdx];

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headlen = 15;

      context.save();
      context.translate(p2.x, p2.y);
      context.rotate(angle);

      const generator = rough.generator();
      const roughOptions: any = {
         stroke: this.stroke,
         strokeWidth: this.strokeWidth,
         roughness: this.roughness === 0 ? 0 : 1.5,
      };

      if (filled) {
         const path = `M 0 0 L ${-headlen} ${headlen / 2} L ${-headlen} ${-headlen / 2} Z`;
         const d = generator.path(path, { ...roughOptions, fill: this.stroke, fillStyle: "solid" });
         rough.canvas(context.canvas as HTMLCanvasElement).draw(d);
      } else {
         const d = generator.path(`M ${-headlen} ${-headlen / 2} L 0 0 L ${-headlen} ${headlen / 2}`, roughOptions);
         rough.canvas(context.canvas as HTMLCanvasElement).draw(d);
      }

      context.restore();
   }

   // --- Edit Mode ---
   activeRect(ctx?: CanvasRenderingContext2D) {
      const context = ctx || this.ctx;
      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      // Use the board's view scale directly to avoid any getTransform() inconsistencies
      const currentScale = this._board.view.scl * this._board.getCanvasDpr();

      const drawDot = (cx: number, cy: number, ghost: boolean = false) => {
         // Clamp the size so it doesn't become overwhelmingly large relative to small shapes when zoomed out
         const maxAllowedSize = Math.max(this.width, this.height, 20) * 0.4;
         const size = Math.min(8 / currentScale, maxAllowedSize);
         context.beginPath();
         context.fillStyle = ghost ? "rgba(255, 255, 255, 0.5)" : "white";
         context.strokeStyle = INDICATOR_COLOR;
         context.lineWidth = 2 / currentScale;
         if (typeof context.roundRect === "function") {
            context.roundRect(cx - size / 2, cy - size / 2, size, size, size * 0.5);
         } else {
            context.rect(cx - size / 2, cy - size / 2, size, size);
         }
         context.stroke();
         context.fill();
         context.closePath();
      };

      // Draw dots at all points
      for (let i = 0; i < this.points.length; i++) {
         drawDot(this.left + this.points[i].x, this.top + this.points[i].y);
      }

      // Draw ghost midpoints
      for (let i = 0; i < this.points.length - 1; i++) {
         const p1 = this.points[i];
         const p2 = this.points[i + 1];
         drawDot(this.left + (p1.x + p2.x) / 2, this.top + (p1.y + p2.y) / 2, true);
      }

      // If attached, show ghost handle between last and first
      if (this.attached && this.points.length > 2) {
         const pLast = this.points[this.points.length - 1];
         const pFirst = this.points[0];
         drawDot(this.left + (pLast.x + pFirst.x) / 2, this.top + (pLast.y + pFirst.y) / 2, true);
      }

      context.restore();
   }

   // --- Resizing & Point Insertion ---
   IsResizable(p: Point): resizeDirection | null {
      if (!this.points.length) return null;

      const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      const testP: Point = this.rotate !== 0 ? rotatePoint(p, center, -this.rotate) : p;

      // 1. Check all real points
      for (let i = 0; i < this.points.length; i++) {
         const dx = Math.abs(this.points[i].x + this.left - testP.x);
         const dy = Math.abs(this.points[i].y + this.top - testP.y);
         if (dx < this.padding && dy < this.padding) {
            this.resizeIndex = i;
            return "b";
         }
      }

      // 2. Check ghost midpoints (tighter hit area to avoid accidental insertion)
      for (let i = 0; i < this.points.length - 1; i++) {
         const midX = (this.points[i].x + this.points[i + 1].x) / 2;
         const midY = (this.points[i].y + this.points[i + 1].y) / 2;
         const dx = Math.abs(midX + this.left - testP.x);
         const dy = Math.abs(midY + this.top - testP.y);
         if (dx < 5 && dy < 5) {
            this.points.splice(i + 1, 0, { x: midX, y: midY });
            this.resizeIndex = i + 1;
            return "b";
         }
      }

      return null;
   }

   Resize(current: Point, oldBox: BoxInterface, d: resizeDirection): Shape[] | void {
      // Start/end endpoints: use Line's connection-aware logic
      if (this.resizeIndex === 0 || this.resizeIndex === this.points.length - 1) {
         const result = super.Resize(current, oldBox, d);

         // Check for auto-attach (snap-to-close)
         if (this.points.length > 2) {
            const p0 = this.points[0];
            const pLast = this.points[this.points.length - 1];
            const dist = Math.hypot(p0.x - pLast.x, p0.y - pLast.y);
            this.attached = dist < this.padding * 2;
         }

         return result;
      }

      // Interior points: direct manipulation (no connection logic)
      if (this.resizeIndex !== null && this.resizeIndex > 0 && this.resizeIndex < this.points.length - 1) {
         const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
         const adjusted = this.rotate !== 0 ? rotatePoint(current, center, -this.rotate) : current;
         this.points[this.resizeIndex] = {
            x: adjusted.x - this.left,
            y: adjusted.y - this.top,
         };
         return undefined;
      }
   }

   // --- Double-click: add/remove points ---
   handleDoubleClick(p: Point): boolean {
      const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      const testP: Point = this.rotate !== 0 ? rotatePoint(p, center, -this.rotate) : p;

      // 1. Check if double-clicked on an existing point to delete it
      for (let i = 0; i < this.points.length; i++) {
         const dx = Math.abs(this.points[i].x + this.left - testP.x);
         const dy = Math.abs(this.points[i].y + this.top - testP.y);
         if (dx < this.padding * 2 && dy < this.padding * 2) {
            // Cannot delete if 2 or fewer points
            if (this.points.length > 2) {
               this.points.splice(i, 1);
               this.setCoords();
            }
            return true;
         }
      }

      // 2. Check if double-clicked near a segment to add a new point
      for (let i = 0; i < this.points.length - 1; i++) {
         const ax = this.points[i].x + this.left;
         const ay = this.points[i].y + this.top;
         const bx = this.points[i + 1].x + this.left;
         const by = this.points[i + 1].y + this.top;

         // Point-to-segment distance
         const abx = bx - ax, aby = by - ay;
         const apx = testP.x - ax, apy = testP.y - ay;
         const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)));
         const projX = ax + t * abx, projY = ay + t * aby;
         const dist = Math.hypot(testP.x - projX, testP.y - projY);

         if (dist < this.padding * 3) {
            const newPoint = { x: testP.x - this.left, y: testP.y - this.top };
            this.points.splice(i + 1, 0, newPoint);
            this.setCoords();
            return true;
         }
      }

      return false;
   }

   // Invalidate rough cache when points change
   private invalidateRoughCache() {
      this.roughDrawable = null;
      this._cachedPathStr = null;
   }
}

export default LineShape;
