import type { ActiveSelectionShape } from "./shape_types";
import Box from "../utils/box";
import Ellipse from "./ellipse";
import Line from "./line/line";
import Path from "./paths/path";
import Shape from "./shape";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect, isDraggableWithRotation } from "../utils/resize";
import { resizeWithRotationAndFlip } from "../utils/resizeWithRotation";
import { calcPointWithRotation, rotatePoint } from "../utils/utilfunc";
import Group from "./group";
import { INDICATOR_COLOR } from "../constants.ts";

export type ActiveSeletionProps = {
   shapes?: { oldProps?: BoxInterface; s: Shape }[];
};

class ActiveSelection extends Shape {
   private setUp = 0;
   declare shapes: ActiveSelectionShape[];

   /**
    *
    * @param props ShapeProps
    * @param setup if 0 means it will take every shape that is within its box as selected
    *  especially used on first mousedown after creation
    */
   constructor(props: ShapeProps & ActiveSeletionProps, setup?: 0 | 1) {
      super(props);
      this.shapes = props.shapes || [];
      this.type = "selection";
      this.fill = "#404040";
      this.stroke = "#404040";
      this.strokeWidth = 1.5;
      if (setup) {
         this.setUp = setup;
      }

      this.setCoords();
   }

   toSVG(): string {
      return "";
   }

   group() {
      if (!this.shapes.length) return;

      const newGroup = new Group({
         shapes: this.shapes.map((s) => ({ s: s.s, oldProps: s.oldProps })),
         ctx: this._board.ctx,
         _board: this._board,
      });
      // Mark members as owned by this group (shapes stay in shapeStore)
      this.shapes.forEach(({ s }) => {
         s.groupId = newGroup.ID();
      });
      this._board.add(newGroup);
      this._board.discardActiveShapes();
      this._board.setActiveShape(newGroup);
   }

   clone(): Shape {
      const props = super.cloneProps();
      const cloneShapes = this.shapes
         .filter((s) => s.s.ID() !== this.ID())
         .map((s) => ({ s: s.s.clone(), oldProps: s.oldProps }));
      return new ActiveSelection(
         {
            ...props,
            shapes: cloneShapes,
         },
         1,
      );
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

   private applyRotationToChildren(props: Record<string, any>, isSilent: boolean) {
      if ("rotate" in props && props.rotate !== undefined) {
         const delta = props.rotate - this.rotate;
         if (delta !== 0) {
            const selCenter = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
            this.shapes.forEach(({ s }) => {
               const newCenter = rotatePoint(
                  { x: s.left + s.width / 2, y: s.top + s.height / 2 },
                  selCenter,
                  delta,
               );
               const newProps = {
                  left: newCenter.x - s.width / 2,
                  top: newCenter.y - s.height / 2,
                  rotate: s.rotate + delta,
               };
               if (isSilent) {
                  s.setSilent(newProps);
               } else {
                  s.set(newProps);
               }
            });
         }
      }
   }

   set(key: string | Record<string, any>, value?: any): this {
      const props: Record<string, any> = typeof key === "object" ? key : { [key]: value };
      this.applyRotationToChildren(props, false);
      return super.set(props);
   }

   setSilent(key: string | Record<string, any>, value?: any): this {
      const props: Record<string, any> = typeof key === "object" ? key : { [key]: value };
      this.applyRotationToChildren(props, true);
      return super.setSilent(props);
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.shapes.forEach((s) => {
         // guard just incase if it calls itself
         if (s?.s && this.ID() != s?.s.ID()) {
            s.s.setSilent({
               left: s.s.left + dx,
               top: s.s.top + dy
            });
            // If this shape is a Group, also move its inner children
            if (s.s instanceof Group) {
               s.s.shapes.forEach(({ s: child }) => {
                  child.setSilent({
                     left: child.left + dx,
                     top: child.top + dy
                  });
               });
            }
         }
      });

      this.set({
         left: this.left += dx,
         top: this.top += dy,
      })
      // this.dragTarget(dx, dy)

      const drg = super.dragging(prev, current);
      if (!drg) {
         return;
      }
      return [...drg, ...this.shapes.map((s) => s.s)];
   }

   draw(options: { active: boolean; ctx?: CanvasRenderingContext2D; addStyles?: boolean }): void {
      const context = options.ctx || this.ctx;
      const pad = this.padding * 0.5;
      const x = this.left - pad;
      const y = this.top - pad;
      const w = this.width + pad;
      const h = this.height + pad;

      // Compute actual uniform scale using only view scale
      const currentScale = this._board.view.scl;

      context.save();

      // Apply rotation around center
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      // Draw outer rectangle with constant visual width
      context.beginPath();
      context.setLineDash([10 / currentScale, 10 / currentScale, 3 / currentScale]);
      context.strokeStyle = INDICATOR_COLOR;
      context.lineWidth = this.strokeWidth / currentScale; // Adjust for scale
      context.rect(x, y, w, h);
      context.stroke();
      context.closePath();

      // Corner dot size in screen pixels
      const screenDotSize = 8;
      const drawDot = (cx: number, cy: number) => {
         const wh = screenDotSize / currentScale; // Inverse scale for visual consistency
         context.beginPath();
         context.setLineDash([0, 0]);
         context.fillStyle = this._board.background;
         context.strokeStyle = INDICATOR_COLOR;
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

   activeRect(ctx?: CanvasRenderingContext2D) {
      const context = ctx || this.ctx;
      const pad = this.padding * 0.5;
      const x = this.left - pad;
      const y = this.top - pad;
      const w = this.width + pad * 2;
      const h = this.height + pad * 2;

      // Compute actual uniform scale using only view scale
      const currentScale = this._board.view.scl;

      context.save();

      // Apply rotation around center
      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      const handleSizePx = 8;
      const outlineWidthPx = 3;
      const handleBorderPx = 1;

      // Excalidraw-like active outline
      context.beginPath();
      context.setLineDash([10 / currentScale, 10 / currentScale, 3 / currentScale]);
      context.strokeStyle = INDICATOR_COLOR;
      context.lineWidth = outlineWidthPx / currentScale;
      context.rect(x, y, w, h);
      context.stroke();
      context.closePath();

      const drawHandle = (cx: number, cy: number) => {
         const size = handleSizePx / currentScale;
         context.beginPath();
         context.setLineDash([]);
         context.fillStyle = this._board.background || "#ffffff";
         context.strokeStyle = INDICATOR_COLOR;
         context.lineWidth = handleBorderPx / currentScale;
         // Semi rounded dots
         context.roundRect(cx - size * 0.5, cy - size * 0.5, size, size, size * 0.5);
         context.fill();
         context.stroke();
         context.closePath();
      };

      drawHandle(x, y);
      drawHandle(x + w / 2, y);
      drawHandle(x + w, y);
      drawHandle(x, y + h / 2);
      drawHandle(x + w, y + h / 2);
      drawHandle(x, y + h);
      drawHandle(x + w / 2, y + h);
      drawHandle(x + w, y + h);

      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      const newBounds = resizeWithRotationAndFlip({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 1,
         minHeight: 1,
      });

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

      let groupFlipX = false;
      let groupFlipY = false;
      switch (d) {
         case "l":
         case "bl":
         case "tl":
            groupFlipX = localX > halfW;
            break;
         case "r":
         case "br":
         case "tr":
            groupFlipX = localX < -halfW;
            break;
      }
      switch (d) {
         case "t":
         case "tr":
         case "tl":
            groupFlipY = localY > halfH;
            break;
         case "b":
         case "br":
         case "bl":
            groupFlipY = localY < -halfH;
            break;
      }

      this.set({
         left: newBounds.left,
         top: newBounds.top,
         width: newBounds.width,
         height: newBounds.height,
      });

      const oldWidth = old.x2 - old.x1;
      const oldHeight = old.y2 - old.y1;
      const newWidth = this.width;
      const newHeight = this.height;

      if (this.setUp == 0) {
         const ox = Math.min(this.left, this.left + this.width);
         const oy = Math.min(this.top, this.top + this.height);
         const outer = new Box({
            x1: ox,
            x2: ox + Math.abs(this.width),
            y1: oy,
            y2: oy + Math.abs(this.height),
         });

         const selected: Shape[] = [];
         const selectedShapes: ActiveSelectionShape[] = [];

         const getRotatedBounds = (s: Shape) => {
            if (!s.rotate) {
               return new Box({
                  x1: Math.min(s.left, s.left + s.width),
                  x2: Math.max(s.left, s.left + s.width),
                  y1: Math.min(s.top, s.top + s.height),
                  y2: Math.max(s.top, s.top + s.height)
               });
            }
            const cx = s.left + s.width / 2;
            const cy = s.top + s.height / 2;
            const w2 = Math.abs(s.width) / 2;
            const h2 = Math.abs(s.height) / 2;
            const cos = Math.cos(s.rotate);
            const sin = Math.sin(s.rotate);

            const corners = [
               { x: -w2, y: -h2 }, { x: w2, y: -h2 },
               { x: -w2, y: h2 }, { x: w2, y: h2 }
            ];

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
               const rx = cx + c.x * cos - c.y * sin;
               const ry = cy + c.x * sin + c.y * cos;
               if (rx < minX) minX = rx;
               if (rx > maxX) maxX = rx;
               if (ry < minY) minY = ry;
               if (ry > maxY) maxY = ry;
            }
            return new Box({ x1: minX, x2: maxX, y1: minY, y2: maxY });
         };

         this._board.shapeStore.forEach((shape) => {
            if (shape.ID() === this.ID() || shape.type === "selection" || shape.groupId) return false;

            const inner = getRotatedBounds(shape);

            if (!outer.intersects(inner)) return false;

            selected.push(shape);
            const activeShapeInfo: ActiveSelectionShape = {
               s: shape,
               oldProps: inner,
               originalFlipX: shape.flipX,
               originalFlipY: shape.flipY,
            };
            if (shape instanceof Group) {
               activeShapeInfo.childOldProps = shape.shapes.map(({ s: child }) => new Box({
                  x1: child.left,
                  y1: child.top,
                  x2: child.left + child.width,
                  y2: child.top + child.height,
               }));
            }
            selectedShapes.push(activeShapeInfo);

            return false;
         });
         this.shapes = selectedShapes;
         return selected;
      } else {
         this.shapes.forEach((s) => {
            if (!s.s || !s.oldProps) return;

            const relativeLeft = s.oldProps.x1 - old.x1;
            const relativeTop = s.oldProps.y1 - old.y1;

            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;

            let newLeft = this.left + relativeLeft * scaleX;
            let newTop = this.top + relativeTop * scaleY;

            const newWidthS = (s.oldProps.x2 - s.oldProps.x1) * scaleX;
            const newHeightS = (s.oldProps.y2 - s.oldProps.y1) * scaleY;

            if (groupFlipX) {
               newLeft = this.left + newWidth - (relativeLeft * scaleX) - newWidthS;
            }
            if (groupFlipY) {
               newTop = this.top + newHeight - (relativeTop * scaleY) - newHeightS;
            }

            if (s.s instanceof Ellipse && s.s.type === "ellipse") {
               s.s.rx = newWidthS / 2;
               s.s.ry = newHeightS / 2;
            }

            if (s.s instanceof Path || s.s instanceof Line) {
               const lastPoints = s.s.lastPoints;
               s.s.points.forEach((p, i) => {
                  const original = lastPoints[i];
                  const scaledX = (original.x / oldWidth) * newWidth;
                  const scaledY = (original.y / oldHeight) * newHeight;
                  p.x = scaledX;
                  p.y = scaledY;
               });
               s.s.cachedLocalPath = null; // Clear path cache since points changed
            }

            s.s.setSilent({
               left: newLeft,
               top: newTop,
               width: newWidthS,
               height: newHeightS,
               flipX: groupFlipX ? !s.originalFlipX : s.originalFlipX,
               flipY: groupFlipY ? !s.originalFlipY : s.originalFlipY,
            });

            // If this shape is a Group, proportionally reposition its inner children
            if (s.s instanceof Group && s.childOldProps) {
               const childScaleX = newWidthS / (s.oldProps.x2 - s.oldProps.x1);
               const childScaleY = newHeightS / (s.oldProps.y2 - s.oldProps.y1);
               
               s.s.shapes.forEach(({ s: child }, i) => {
                  const childOld = s.childOldProps![i];
                  if (!childOld) return;
                  
                  // Child's position relative to the old group origin
                  const relX = childOld.x1 - s.oldProps!.x1;
                  const relY = childOld.y1 - s.oldProps!.y1;

                  const newChildWidth = (childOld.x2 - childOld.x1) * childScaleX;
                  const newChildHeight = (childOld.y2 - childOld.y1) * childScaleY;

                  let newChildLeft = newLeft + relX * childScaleX;
                  let newChildTop = newTop + relY * childScaleY;

                  if (groupFlipX) {
                     newChildLeft = newLeft + newWidthS - (relX * childScaleX) - newChildWidth;
                  }
                  if (groupFlipY) {
                     newChildTop = newTop + newHeightS - (relY * childScaleY) - newChildHeight;
                  }

                  child.setSilent({
                     left: newChildLeft,
                     top: newChildTop,
                     width: newChildWidth,
                     height: newChildHeight,
                  });
               });
            }
         });
         return this.shapes.map((s) => s.s);
      }
   }

   mouseup(s: ShapeEventData): void {
      if (this.setUp == 0) {
         let updateBox = new Box({
            x1: Infinity,
            x2: -Infinity,
            y1: Infinity,
            y2: -Infinity,
         });

         const getRotatedBounds = (shape: Shape) => {
            if (!shape.rotate) {
               return new Box({
                  x1: Math.min(shape.left, shape.left + shape.width),
                  x2: Math.max(shape.left, shape.left + shape.width),
                  y1: Math.min(shape.top, shape.top + shape.height),
                  y2: Math.max(shape.top, shape.top + shape.height)
               });
            }
            const cx = shape.left + shape.width / 2;
            const cy = shape.top + shape.height / 2;
            const w2 = Math.abs(shape.width) / 2;
            const h2 = Math.abs(shape.height) / 2;
            const cos = Math.cos(shape.rotate);
            const sin = Math.sin(shape.rotate);

            const corners = [
               { x: -w2, y: -h2 }, { x: w2, y: -h2 },
               { x: -w2, y: h2 }, { x: w2, y: h2 }
            ];

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
               const rx = cx + c.x * cos - c.y * sin;
               const ry = cy + c.x * sin + c.y * cos;
               if (rx < minX) minX = rx;
               if (rx > maxX) maxX = rx;
               if (ry < minY) minY = ry;
               if (ry > maxY) maxY = ry;
            }
            return new Box({ x1: minX, x2: maxX, y1: minY, y2: maxY });
         };

         // Just calculate bounds from the shapes already selected by Resize
         this.shapes.forEach((item) => {
            const inner = getRotatedBounds(item.s);
            updateBox = updateBox.compareAndReturnSmall(inner);
         });

         if (this.shapes.length > 0) {
            this.setSilent({
               left: updateBox.x1,
               top: updateBox.y1,
               width: updateBox.x2 - updateBox.x1,
               height: updateBox.y2 - updateBox.y1
            });

            // Explicitly clear animation targets so they don't instantly override our snapped bounds
            this.targetLeft = null;
            this.targetTop = null;
            this.targetWidth = null;
            this.targetHeight = null;
         }
      }

      if (this.setUp <= 0) this.setUp++;
      this.emit("mouseup", s);
   }

   mousedown(e: ShapeEventData): void {
      this.emit("mousedown", e);
   }

   mouseover(s: ShapeEventData): void {
      if (this._board.activeShapes?.ID() === this.ID()) {
         if (this.isRotating && this.isRotating(s.e.point)) {
            this._board.setCursor("grab");
            this.emit("mouseover", s);
            return;
         }

         const d = this.IsResizable(s.e.point);
         if (d) {
            const cursor = this.getRotatedCursor(d, this.rotate);
            this._board.setCursor(cursor);
         } else {
            this._board.setCursor("default");
         }
      } else {
         this._board.setCursor("default");
      }

      this.emit("mouseover", s);
   }

   setCoords(): void {
      if (this.shapes.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      this.shapes.forEach((s) => {
         const bounds = s.s.getBounds();
         if (bounds.x < minX) minX = bounds.x;
         if (bounds.y < minY) minY = bounds.y;
         if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
         if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
      });

      this.left = minX - this.padding;
      this.top = minY - this.padding;
      this.width = maxX - minX + this.padding * 2;
      this.height = maxY - minY + this.padding * 2;

      this.targetLeft = null;
      this.targetTop = null;
      this.targetWidth = null;
      this.targetHeight = null;
   }

   // toObject(): Identity<Shape> {
   //   const obj = {} as { [K in keyof this]: this[K] | unknown };
   //   for (const key of Object.keys(this) as Array<keyof this>) {
   //     const strKey = String(key);
   //     if (!strKey.startsWith("_") && !keysNotNeeded.includes(strKey)) {
   //       if (strKey === "shapes") {
   //         const shapes = this[strKey];
   //         const s = shapes.map((s) => s.s.toObject());
   //         obj[key] = s;
   //       } else {
   //         obj[key] = this[key];
   //       }
   //     }
   //   }
   //   return obj;
   // }
}

export default ActiveSelection;
