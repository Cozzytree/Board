import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { DrawProps } from "../shape";
import { isDraggableWithRotation, resizeRect } from "../../utils/resize";
import Box from "@/board/utils/box";
import Shape from "@/board/shapes/shape";
import { setCoords, calcPointWithRotation } from "@/board/utils/utilfunc";
import { resizeWithRotationAndFlip } from "@/board/utils/resizeWithRotation";

export type PathProps = {
  points?: Point[];
  pathType?: string;
};

class Path extends Shape {
  declare points: Point[];
  lastPoints: Point[];
  declare pathType: string;

  constructor(props: ShapeProps & PathProps) {
    super(props);
    this.points = props.points || [];
    this.lastPoints = this.points.map((p) => {
      return { x: p.x, y: p.y };
    });
    this.type = "path";
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

    context.save();

    // Rotation logic
    const centerX = this.left + this.width * 0.5;
    const centerY = this.top + this.height * 0.5;
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);

    context.translate(this.left, this.top);

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
      context.lineWidth = this.strokeWidth / currentScale;
      context.strokeStyle = this.stroke;
      context.fillStyle = this.fill;
    }
    context.scale(this.scale, this.scale);

    context.beginPath();

    let startX = this.points[0].x;
    let startY = this.points[0].y;

    if (this.flipX) {
      startX = this.width - startX;
    }

    if (this.flipY) {
      startY = this.height - startY;
    }

    context.moveTo(startX, startY);

    for (let i = 1; i < this.points.length; i++) {
      let x = this.points[i].x;
      let y = this.points[i].y;

      if (this.flipX) {
        x = this.width - x;
      }

      if (this.flipY) {
        y = this.height - y;
      }
      context.lineTo(x, y);
    }
    if (addStyles) {
      context.fill();
    }

    if (!resize) {
      context.fill();
    }
    context.closePath();
    context.stroke();
    context.restore();

    super.renderText({ context });
  }

  IsResizable(p: Point) {
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
      this.padding,
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

    super.set({
      left: newBounds.left,
      top: newBounds.top,
      width: newWidth,
      height: newHeight,
      flipX,
      flipY,
    });

    return super.Resize(current, old, d);
  }

  dragging(prev: Point, current: Point) {
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;

    this.left += dx;
    this.top += dy;

    return super.dragging(prev, current);
  }
}

export default Path;
