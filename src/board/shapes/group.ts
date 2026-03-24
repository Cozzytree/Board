import type { BoxInterface, Identity, Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation } from "../utils/utilfunc";
import Line from "./line/line";
import Path from "./paths/path";
import Shape, { type DrawProps } from "./shape";

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

  constructor(props: ShapeProps & Props) {
    super(props);
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

  Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
    const newBounds = resizeWithRotation({
      current,
      old,
      direction: d,
      rotate: this.rotate,
      minWidth: 20,
      minHeight: 20,
    });
    this.left = newBounds.left;
    this.top = newBounds.top;
    this.width = newBounds.width;
    this.height = newBounds.height;

    const oldWidth = old.x2 - old.x1;
    const oldHeight = old.y2 - old.y1;
    const newWidth = this.width;
    const newHeight = this.height;

    this.shapes.forEach((s) => {
      if (!s.s || !s.oldProps) return;

      const relativeLeft = s.oldProps.x1 - old.x1;
      const relativeTop = s.oldProps.y1 - old.y1;

      const scaleX = newWidth / oldWidth;
      const scaleY = newHeight / oldHeight;

      const newLeft = this.left + relativeLeft * scaleX;
      const newTop = this.top + relativeTop * scaleY;

      const newWidthS = (s.oldProps.x2 - s.oldProps.x1) * scaleX;
      const newHeightS = (s.oldProps.y2 - s.oldProps.y1) * scaleY;

      if (s.s.type === "ellipse") {
        s.s.set({
          rx: newWidthS / 2,
          ry: newHeightS / 2,
        });
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
      }
      s.s.set({
        left: newLeft,
        top: newTop,
        width: newWidthS,
        height: newHeightS,
      });
    });
    return this.shapes.map((s) => s.s);
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

  IsResizable(p: Point): resizeDirection | null {
    const { width, height, left, top, rotate } = this;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const localBox = new Box({
      x1: -halfW,
      x2: halfW,
      y1: -halfH,
      y2: halfH,
    });
    const d = resizeRect(
      calcPointWithRotation({ height, width, left, point: p, rotate, top }),
      localBox,
      this.padding,
    );
    if (d) {
      return d.rd;
    }

    return null;
  }

  IsDraggable(p: Point): boolean {
    const { width, height, left, top, rotate } = this;
    const cx = left + width / 2;
    const cy = top + height / 2;
    const cos = Math.cos(-rotate);
    const sin = Math.sin(-rotate);
    const dx = p.x - cx;
    const dy = p.y - cy;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const halfW = width / 2;
    const halfH = height / 2;
    const hit = this.padding;

    const inOuter = localX >= -(halfW + hit) && localX <= halfW + hit && localY >= -(halfH + hit) && localY <= halfH + hit;
    const inInner = localX > -(halfW - hit) && localX < halfW - hit && localY > -(halfH - hit) && localY < halfH - hit;

    return inOuter && !inInner;
  }

  dragging(prev: Point, current: Point) {
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    this.shapes.forEach(({ s }) => {
      s.left += dx;
      s.top += dy;
    });
    this.left += dx;
    this.top += dy;
    return super.dragging(prev, current);
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

    // Draw children (with reduced opacity during resize/drag preview)
    if (resize) {
      context.save();
      context.globalAlpha = this.selectionAlpha;
    }
    this.shapes.forEach((s) => {
      s?.s.draw({ ctx: context, resize, addStyles });
    });
    if (resize) {
      context.restore();
    }

    // Draw group border
    context.save();
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);

    if (resize) {
      context.globalAlpha = this.selectionAlpha;
      context.strokeStyle = this.selectionColor;
      context.lineWidth = this.selectionStrokeWidth;
      // context.setLineDash([
      //   this.selectionDash[0] / currentScale,
      //   this.selectionDash[1] / currentScale,
      // ]);
    } else {
      context.strokeStyle = "#7c3aed";
      context.lineWidth = 1.5 / currentScale;
      // context.setLineDash([6 / currentScale, 3 / currentScale]);
      context.globalAlpha = 0.5;
    }

    context.roundRect(
      this.left - this.padding,
      this.top - this.padding,
      this.width + (this.padding << 1),
      this.height + (this.padding << 1),
      10,
    );
    context.stroke();
    context.restore();
  }
}

export default Group;
