import Box from "../utils/box";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation, rotatePoint } from "../utils/utilfunc";
import Shape, { type DrawProps } from "./shape";
import { INDICATOR_COLOR } from "../constants";
import type { BoxInterface, Identity, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";

export type GroupDropEvent = {
   shape: Shape;
   point: Point;
   isInside: boolean;
};

type Props = {
   shapes: { s: Shape; oldProps?: BoxInterface }[];
   onDropInto?: (event: GroupDropEvent) => void;
   title?: string;
};

class Group extends Shape {
   declare shapes: { s: Shape; oldProps: BoxInterface | undefined }[];
   title: string;
   onDropInto?: (event: GroupDropEvent) => void;
   private _tempShapes: { s: Shape; oldProps: BoxInterface | undefined }[] = [];
   private _currentShapesIdSet: Set<string> = new Set();

   constructor(props: ShapeProps & Props) {
      super(props);
      this.cachedLocalPath = null;
      this.title = props.title || "frame";
      this.shapes = props.shapes.map((s) => ({ s: s.s, oldProps: s.oldProps }));
      this.onDropInto = props.onDropInto;
      this.type = "group";

      if (props.shapes && props.shapes.length) {
         let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
         props.shapes.forEach(({ s }) => {
            minX = Math.min(minX, s.left);
            minY = Math.min(minY, s.top);
            maxX = Math.max(maxX, s.left + s.width);
            maxY = Math.max(maxY, s.top + s.height);
         });
         this.left = minX - this.padding;
         this.top = minY - this.padding;
         this.width = maxX - minX + this.padding * 2;
         this.height = maxY - minY + this.padding * 2;
      }
   }

   mousedown(s: ShapeEventData): void {
      ;
      this._tempShapes = [];
      this._currentShapesIdSet = new Set(this.shapes.map(s => s.s.ID()));
   }

   private applyRotationToChildren(props: Record<string, any>, isSilent: boolean) {
      if ("rotate" in props && props.rotate !== undefined) {
         const delta = props.rotate - this.rotate;
         if (delta !== 0) {
            const groupCenter = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
            this.shapes.forEach(({ s }) => {
               const newCenter = rotatePoint(
                  { x: s.left + s.width / 2, y: s.top + s.height / 2 },
                  groupCenter,
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

   toSVG() {
      const cx = this.left + this.width / 2;
      const cy = this.top + this.height / 2;
      
      let transformStr = "";
      if (this.rotate !== 0 || this.flipX || this.flipY || this.scale !== 1) {
         transformStr = `transform="`;
         if (this.rotate !== 0) {
            transformStr += `rotate(${(this.rotate * 180) / Math.PI} ${cx} ${cy}) `;
         }
         if (this.flipX || this.flipY || this.scale !== 1) {
            transformStr += `translate(${cx} ${cy}) scale(${this.flipX ? -this.scale : this.scale}, ${this.flipY ? -this.scale : this.scale}) translate(${-cx} ${-cy})`;
         }
         transformStr += `"`;
      }

      const strokeStr = this.stroke === "transparent" ? "none" : this.stroke;
      const rectSvg = `<rect x="${this.left - this.padding}" y="${this.top - this.padding}" width="${this.width + this.padding * 2}" height="${this.height + this.padding * 2}" fill="none" stroke="${strokeStr}" stroke-width="1.5" ${transformStr} />`;
      
      let titleSvg = "";
      if (this.title) {
         titleSvg = `<text x="${this.left - this.padding}" y="${this.top - this.padding - 4}" font-family="${this.fontFamily || "system-ui"}" font-size="14" font-weight="bold" fill="${strokeStr}" text-anchor="start" ${transformStr}>${this.title}</text>`;
      }

      const clipId = `clip_${this.ID()}`;
      const clipSvg = `<clipPath id="${clipId}"><rect x="${this.left}" y="${this.top}" width="${this.width}" height="${this.height}" ${transformStr} /></clipPath>`;
      
      const childrenSvg = this.shapes.map(s => s.s.toSVG()).join('\n    ');

      return `<g>\n  ${clipSvg}\n  ${rectSvg}\n  ${titleSvg}\n  <g clip-path="url(#${clipId})">\n    ${childrenSvg}\n  </g>\n</g>`;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      const newBounds = resizeWithRotation({
         current,
         old,
         direction: d,
         rotate: this.rotate,
         minWidth: 20,
         minHeight: 20,
      });

      this.setSilent({
         left: newBounds.left,
         top: newBounds.top,
         width: newBounds.width,
         height: newBounds.height
      })

      const outer = new Box({
         x1: newBounds.left,
         x2: newBounds.left + newBounds.width,
         y1: newBounds.top,
         y2: newBounds.top + newBounds.height,
      });

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

      this._tempShapes = [];

      this._board.shapeStore.forEach((shape) => {
         if (shape.ID() === this.ID() || shape.type === "selection" || shape.type === "group") return false;

         const inner = getRotatedBounds(shape);

         const isAlreadyInGroup = this._currentShapesIdSet.has(shape.ID());

         // If already in group, indicator shows if partially within (intersects)
         // If not in group, indicator shows only if fully within (fullyContains)
         if (isAlreadyInGroup) {
            if (!outer.intersects(inner)) return false;
         } else {
            if (!outer.fullyContains(inner)) return false;
         }

         this._tempShapes.push({
            s: shape,
            oldProps: inner,
         });

         return false;
      });

      // Do not resize child shapes. Only the group frame changes.
      return [];
   }

   mouseup(s: ShapeEventData): void {
      super.mouseup(s);

      let newShapes: { s: Shape; oldProps: BoxInterface }[] = [];

      const outer = new Box({
         x1: this.left,
         y1: this.top,
         x2: this.left + this.width,
         y2: this.top + this.height
      })

      // Scan EVERY shape on the board
      this._board?.shapeStore.forEach((shape) => {
         // Ignore this group itself, selections, and other groups to prevent cyclic recursion
         if (shape.ID() === this.ID() || shape.type === "selection" || shape.type === "group") {
            return false;
         }

         // Ignore shapes that belong to another group
         if (shape.groupId && shape.groupId !== this.ID()) {
            return false;
         }

         const inner = new Box({
            x1: shape.left,
            y1: shape.top,
            x2: shape.left + shape.width,
            y2: shape.top + shape.height
         })

         const isAlreadyInGroup = shape.groupId === this.ID();

         if (isAlreadyInGroup) {
            // Shape was already a member — keep it UNLESS completely outside
            if (outer.intersects(inner)) {
               newShapes.push({
                  s: shape,
                  oldProps: {
                     x1: shape.left,
                     y1: shape.top,
                     x2: shape.left + shape.width,
                     y2: shape.top + shape.height,
                  },
               });
               shape.groupId = this.ID();
            } else {
               // Completely outside the frame — eject
               shape.groupId = undefined;
            }
         } else {
            // New shape — must be fully contained to join
            if (outer.fullyContains(inner)) {
               newShapes.push({
                  s: shape,
                  oldProps: {
                     x1: shape.left,
                     y1: shape.top,
                     x2: shape.left + shape.width,
                     y2: shape.top + shape.height,
                  },
               });
               shape.groupId = this.ID();
            }
         }

         return false; // continue loop
      });

      this.shapes = newShapes;
      this._tempShapes = [];
   }

   clone(): Shape {
      const props = super.cloneProps();
      const cloneShapes = this.shapes
         .filter((s) => s.s.ID() !== this.ID())
         .map((s) => ({ s: s.s.clone(), oldProps: s.oldProps }));
      return new Group({
         ...props,
         shapes: cloneShapes,
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

   isTitleHovered(p: Point): boolean {
      if (!this.title) return false;
      const titleHeight = 20;
      // Approximate title width or use group width.
      // Excalidraw titles sit at left-aligned above the box. 
      // We draw it at `left - padding`, `top - padding - 4/scl`.
      // We will define the hitbox width as the same as the group width for ease of clicking.
      const titleWidth = this.width; 

      const cx = this.left + this.width / 2;
      const cy = this.top + this.height / 2;
      
      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);
      const dx = p.x - cx;
      const dy = p.y - cy;
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // Unrotated title bounding box relative to group center
      // Title left edge matches group left edge
      const localTitleLeft = -this.width / 2 - this.padding;
      // Title bottom edge is just above group top edge
      const localTitleBottom = -this.height / 2 - this.padding;
      const localTitleTop = localTitleBottom - titleHeight;
      const localTitleRight = localTitleLeft + titleWidth;

      return (
         localX >= localTitleLeft &&
         localX <= localTitleRight &&
         localY >= localTitleTop &&
         localY <= localTitleBottom
      );
   }

   IsDraggable(p: Point): boolean {
      return this.isTitleHovered(p) || isDraggableWithRotation({
         point: p,
         left: this.left,
         top: this.top,
         width: this.width,
         height: this.height,
         rotate: this.rotate,
      });
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
         }
      });

      this.set({
         left: this.left += dx,
         top: this.top += dy,
      })

      return this.shapes.map((s) => s.s);
   }

   containsPoint(p: Point): boolean {
      const cx = this.left + this.width / 2;
      const cy = this.top + this.height / 2;
      const cos = Math.cos(-this.rotate);
      const sin = Math.sin(-this.rotate);
      const dx = p.x - cx;
      const dy = p.y - cy;
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      return (
         localX >= -this.width / 2 &&
         localX <= this.width / 2 &&
         localY >= -this.height / 2 &&
         localY <= this.height / 2
      );
   }

   notifyDrop(shape: Shape, point: Point): void {
      if (!this.onDropInto) return;
      const isInside = this.containsPoint(point);
      this.onDropInto({ shape, point, isInside });
   }

   getShapeAt(p: Point): Shape | null {
      for (const { s } of this.shapes) {
         if (s.IsDraggable(p)) return s;
      }
      return null;
   }

   removeShape(shape: Shape): void {
      shape.groupId = undefined;
      this.shapes = this.shapes.filter(({ s }) => s.ID() !== shape.ID());
   }

   addShape(shape: Shape): void {
      shape.groupId = this.ID();
      const bounds = {
         x1: shape.left,
         y1: shape.top,
         x2: shape.left + shape.width,
         y2: shape.top + shape.height,
      };
      this.shapes.push({ s: shape, oldProps: bounds });
      const newLeft = Math.min(this.left, shape.left - this.padding);
      const newTop = Math.min(this.top, shape.top - this.padding);
      const newRight = Math.max(this.left + this.width, shape.left + shape.width + this.padding);
      const newBottom = Math.max(this.top + this.height, shape.top + shape.height + this.padding);
      this.left = newLeft;
      this.top = newTop;
      this.width = newRight - newLeft;
      this.height = newBottom - newTop;
   }

   ungroup(): Shape[] {
      this.shapes.forEach(({ s }) => {
         s.groupId = undefined;
      });
      return this.shapes.map(({ s }) => s);
   }

   toObject(): Identity<Shape> {
      const obj = super.toObject();
      (obj as any).shapes = this.shapes.map(({ s }) => s.toObject());
      return obj;
   }

   draw({ ctx, resize = false, addStyles = true }: DrawProps): void {
      const context = ctx || this.ctx;
      const currentScale = context.getTransform().a;
      const centerX = this.left + this.width / 2;
      const centerY = this.top + this.height / 2;

      // ── 1. Draw group border + title FIRST (unclipped) ──
      context.save();
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
         context.strokeStyle = this.selectionColor;
         context.lineWidth = this.selectionStrokeWidth;
      } else {
         context.strokeStyle = this.stroke;
         context.lineWidth = 1.5 / currentScale;
      }

      context.beginPath();
      context.rect(
         this.left - this.padding,
         this.top - this.padding,
         this.width + (this.padding << 1),
         this.height + (this.padding << 1),
      );
      context.stroke();

      if (this.title) {
         context.font = `bold 14px ${this.fontFamily || "system-ui"}`;
         context.fillStyle = this.stroke;
         context.textAlign = "left";
         context.textBaseline = "bottom";
         context.fillText(
            this.title,
            this.left - this.padding,
            this.top - this.padding - 4
         );
      }
      context.restore();

      // ── 2. Draw children CLIPPED to group bounds ──
      context.save();
      // Apply rotation so clip rect aligns with the (possibly rotated) group
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();
      context.rect(this.left, this.top, this.width, this.height);
      context.clip();
      // Undo the rotation so children draw in world space
      context.translate(centerX, centerY);
      context.rotate(-this.rotate);
      context.translate(-centerX, -centerY);

      if (resize) {
         context.globalAlpha = this.selectionAlpha;
      }

      this.shapes.forEach(({ s }) => {
         s.draw({ ctx: context, resize: false, addStyles });
      });

      context.restore(); // removes clip + alpha + rotation

      // ── 3. Draw resize indicators (unclipped) ──
      // if (resize) {
      //    context.save();
      //    this._tempShapes.forEach(({ oldProps }) => {
      //       if (!oldProps) return;
      //       const x = oldProps.x1 - 4;
      //       const y = oldProps.y1 - 4;
      //       const w = (oldProps.x2 - oldProps.x1) + 8;
      //       const h = (oldProps.y2 - oldProps.y1) + 8;

      //       context.beginPath();
      //       context.strokeStyle = INDICATOR_COLOR;
      //       context.lineWidth = 2 / currentScale;
      //       context.setLineDash([4 / currentScale, 4 / currentScale]);
      //       context.strokeRect(x, y, w, h);
      //    });
      //    context.restore();
      // }
   }
}

export default Group;
