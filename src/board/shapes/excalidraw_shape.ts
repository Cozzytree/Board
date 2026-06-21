import type { BoxInterface, LibraryItem, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import type { DrawProps } from "./shape";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import Box from "@/board/utils/box";
import Shape from "@/board/shapes/shape";
import { calcPointWithRotation } from "@/board/utils/utilfunc";
import { resizeWithRotationAndFlip } from "@/board/utils/resizeWithRotation";

export type ExcalidrawShapeProps = {
   elements?: any[];
};

class ExcalidrawShape extends Shape {
   declare elements: LibraryItem[];
   private originalBoundingBox: { w: number; h: number };
   _cachedScale: number = 0;

   constructor(props: ShapeProps & ExcalidrawShapeProps) {
      super(props);
      const rawElements = Array.isArray(props.elements) ? JSON.parse(JSON.stringify(props.elements)) : [];
      // Flatten in case the database contains corrupted nested arrays of elements
      this.elements = rawElements.flat(Infinity);
      this.type = "excalidraw";

      let minX = Infinity,
         minY = Infinity,
         maxX = -Infinity,
         maxY = -Infinity;

      if (this.elements.length > 0) {
         this.elements.forEach((el) => {
            let pMinX = 0, pMinY = 0;
            let pMaxX = 0, pMaxY = 0;

            const ex = Number(el.x) || 0;
            const ey = Number(el.y) || 0;
            const ew = Number(el.width) || 0;
            const eh = Number(el.height) || 0;
            const angle = Number(el.angle) || 0;
            const strokeBleed = ((Number(el.strokeWidth) || 2) / 2) + 2; // +2 for roughness/padding

            if (Array.isArray(el.points) && el.points.length > 0) {
               const xs = el.points.map((p: any) => Number(p[0]) || 0);
               const ys = el.points.map((p: any) => Number(p[1]) || 0);
               pMinX = Math.min(...xs);
               pMinY = Math.min(...ys);
               pMaxX = Math.max(...xs);
               pMaxY = Math.max(...ys);

               if (!isFinite(pMinX)) pMinX = 0;
               if (!isFinite(pMinY)) pMinY = 0;
               if (!isFinite(pMaxX)) pMaxX = ew;
               if (!isFinite(pMaxY)) pMaxY = eh;
            } else {
               pMaxX = ew;
               pMaxY = eh;
            }

            // Calculate element center
            const cx = ex + pMinX + ew / 2;
            const cy = ey + pMinY + eh / 2;

            // 4 unrotated corners of the bounding box
            const corners = [
               [ex + pMinX, ey + pMinY],
               [ex + pMaxX, ey + pMinY],
               [ex + pMinX, ey + pMaxY],
               [ex + pMaxX, ey + pMaxY],
            ];

            // Rotate corners and expand by stroke bleed
            corners.forEach(([x, y]) => {
               const cos = Math.cos(angle);
               const sin = Math.sin(angle);
               const dx = x - cx;
               const dy = y - cy;
               const rx = dx * cos - dy * sin + cx;
               const ry = dx * sin + dy * cos + cy;

               if (rx - strokeBleed < minX) minX = rx - strokeBleed;
               if (rx + strokeBleed > maxX) maxX = rx + strokeBleed;
               if (ry - strokeBleed < minY) minY = ry - strokeBleed;
               if (ry + strokeBleed > maxY) maxY = ry + strokeBleed;
            });
         });

         if (!isFinite(minX)) minX = 0;
         if (!isFinite(minY)) minY = 0;
         if (!isFinite(maxX)) maxX = 100;
         if (!isFinite(maxY)) maxY = 100;

         this.elements.forEach((el) => {
            el.x = (Number(el.x) || 0) - minX;
            el.y = (Number(el.y) || 0) - minY;
         });

         this.originalBoundingBox = {
            w: maxX - minX,
            h: maxY - minY,
         };

         // Set reasonable defaults if width/height are too small (like 4x4 from ShapeTool)
         if (!props.width || props.width < 10) this.width = this.originalBoundingBox.w || 100;
         if (!props.height || props.height < 10) this.height = this.originalBoundingBox.h || 100;

      } else {
         this.originalBoundingBox = { w: 100, h: 100 };
         if (!props.width || props.width < 10) this.width = 100;
         if (!props.height || props.height < 10) this.height = 100;
      }
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new ExcalidrawShape({
         ...props,
         elements: JSON.parse(JSON.stringify(this.elements)),
      });
   }

   mouseup(s: ShapeEventData): void {
      super.set("lastFlippedState", {
         x: super.get("flipX"),
         y: super.get("flipY"),
      });
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

   draw({ ctx, addStyles: _addStyles = true, resize }: DrawProps): void {
      const context = ctx || this.ctx;
      const currentScale = context.getTransform().a;

      if (currentScale !== this._cachedScale) {
         this._cachedScale = currentScale;
         this.elements.forEach((el: any) => {
            if (el.type === "text") return;
            const p = new Path2D();
            if (el.type === "rectangle") {
               if (el?.roundness && typeof p.roundRect === "function") {
                  try {
                     p.roundRect(0, 0, el.width || 100, el.height || 100, 8);
                  } catch (e) {
                     p.rect(0, 0, el.width || 100, el.height || 100);
                  }
               } else {
                  p.rect(0, 0, el.width || 100, el.height || 100);
               }
            } else if (el.type === "ellipse") {
               p.ellipse((el.width || 100) / 2, (el.height || 100) / 2, (el.width || 100) / 2, (el.height || 100) / 2, 0, 0, Math.PI * 2);
            } else if (el.type === "line" || el.type === "freedraw" || el.type === "arrow" || el.type === "diamond") {
               if (el.points && el.points.length > 0) {
                  p.moveTo(el.points[0][0], el.points[0][1]);
                  for (let i = 1; i < el.points.length; i++) {
                     p.lineTo(el.points[i][0], el.points[i][1]);
                  }
               }
            }
            el._cachedPath = p;
         });
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

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.fillStyle = this.selectionFill;
         context.lineWidth = this.selectionStrokeWidth / currentScale;
         context.setLineDash([
            this.selectionDash[0] / currentScale,
            this.selectionDash[1] / currentScale,
         ]);
      } else {
         context.setLineDash(this.dash);
         context.lineWidth = this.strokeWidth;
         context.strokeStyle = this.stroke;
         context.fillStyle = this.fill;
      }

      const scaleX = this.width / (this.originalBoundingBox.w || 1);
      const scaleY = this.height / (this.originalBoundingBox.h || 1);

      if (this.flipX || this.flipY) {
         context.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
         context.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
      }

      context.scale(scaleX, scaleY);

      this.elements.forEach((el) => {
         context.save();
         let pMinX = 0, pMinY = 0;
         if (el.points && el.points.length > 0) {
            pMinX = Math.min(...el.points.map((p: number[]) => p[0]));
            pMinY = Math.min(...el.points.map((p: number[]) => p[1]));
         }

         const cx = el.x + pMinX + (el.width || 0) / 2;
         const cy = el.y + pMinY + (el.height || 0) / 2;

         context.translate(cx, cy);
         if (el.angle) context.rotate(el.angle);
         context.translate(el.x - cx, el.y - cy);

         if (!resize) {
            context.strokeStyle = el.strokeColor || this.stroke || "#000000";
            let fill = el.backgroundColor;
            if (!fill || fill === "transparent") fill = "transparent";
            context.fillStyle = fill;
            context.lineWidth = (this.strokeWidth || 1);
            if (el.strokeStyle === "dashed") context.setLineDash([8, 8]);
            else if (el.strokeStyle === "dotted") context.setLineDash([2, 6]);
         } else {
            context.fillStyle = "transparent";
         }

         if (el._cachedPath) {
            if (!resize) {
               if (context.fillStyle !== "transparent") {
                  context.fill(el._cachedPath);
               }
               if (context.strokeStyle !== "transparent") {
                  context.stroke(el._cachedPath);
               }
            } else {
               context.fill(el._cachedPath);
               context.stroke(el._cachedPath);
            }
         } else if (el.type === "text") {
            context.font = `${el?.fontSize || 20}px ${el?.fontFamily === 1 ? 'Virgil' : 'system-ui'}`;
            context.fillStyle = el.fillStyle || this.stroke || "#000000";
            context.textAlign = el.textAlign || "left";
            context.textBaseline = el?.baseline || "top";

            const lines = (el.text || "").split("\n");
            lines.forEach((line: string, i: number) => {
               context.fillText(line, 0, i * (el?.fontSize || 20) * 1.2);
            });
         }
         context.restore();
      });

      context.restore();

      super.renderText({ context });
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const localBox = new Box({
         x1: -width / 2,
         x2: width / 2,
         y1: -height / 2,
         y2: height / 2,
      });
      const rs = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );
      if (rs) return rs.rd;
      return null;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection) {
      const newBounds = resizeWithRotationAndFlip({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 10,
         minHeight: 10,
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

      const halfW = (old.x2 - old.x1) / 2;
      const halfH = (old.y2 - old.y1) / 2;

      let flipX = this.lastFlippedState.x;
      let flipY = this.lastFlippedState.y;

      switch (d) {
         case "l": case "bl": case "tl": flipX = this.lastFlippedState.x ? localX < halfW : localX > halfW; break;
         case "r": case "br": case "tr": flipX = this.lastFlippedState.x ? localX > -halfW : localX < -halfW; break;
      }
      switch (d) {
         case "t": case "tr": case "tl": flipY = this.lastFlippedState.y ? localY < halfH : localY > halfH; break;
         case "b": case "br": case "bl": flipY = this.lastFlippedState.y ? localY > -halfH : localY < -halfH; break;
      }

      super.setSilent({
         flipX,
         flipY,
      });

      this.setTarget({
         left: newBounds.left,
         top: newBounds.top,
         width: newWidth,
         height: newHeight,
      });

      return super.Resize(current, old, d);
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      this.dragTarget(dx, dy);
      return super.dragging(prev, current);
   }
}

export default ExcalidrawShape;
