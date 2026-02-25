import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
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
  declare elements: any[];
  private originalBoundingBox: { w: number; h: number };

  constructor(props: ShapeProps & ExcalidrawShapeProps) {
    super(props);
    this.elements = Array.isArray(props.elements) ? JSON.parse(JSON.stringify(props.elements)) : [];
    this.type = "excalidraw";

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    if (this.elements.length > 0) {
      this.elements.forEach((el) => {
        if (el.x < minX) minX = el.x;
        if (el.y < minY) minY = el.y;
        if (el.x + el.width > maxX) maxX = el.x + el.width;
        if (el.y + el.height > maxY) maxY = el.y + el.height;
      });

      this.elements.forEach((el) => {
        el.x -= minX;
        el.y -= minY;
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

    const scaleX = this.width / (this.originalBoundingBox.w || 1);
    const scaleY = this.height / (this.originalBoundingBox.h || 1);

    if (this.flipX || this.flipY) {
      context.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
      context.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    }

    context.scale(scaleX, scaleY);

    this.elements.forEach((el) => {
      context.save();

      context.translate(el.x + el.width / 2, el.y + el.height / 2);
      if (el.angle) context.rotate(el.angle);
      context.translate(-(el.width / 2), -(el.height / 2));

      if (!resize) {
        context.strokeStyle = el.strokeColor || this.stroke || "#000000";
        let fill = el.backgroundColor;
        if (!fill || fill === "transparent") fill = "transparent";
        context.fillStyle = fill;
        context.lineWidth = (el.strokeWidth || this.strokeWidth || 1) / currentScale;
        if (el.strokeStyle === "dashed") context.setLineDash([8 / currentScale, 8 / currentScale]);
        else if (el.strokeStyle === "dotted") context.setLineDash([2 / currentScale, 6 / currentScale]);
      } else {
        context.fillStyle = "transparent";
      }

      context.beginPath();

      if (el.type === "rectangle") {
        if (el.roundness) {
          context.roundRect(0, 0, el.width || 100, el.height || 100, 8);
        } else {
          context.rect(0, 0, el.width || 100, el.height || 100);
        }
      } else if (el.type === "ellipse") {
        context.ellipse((el.width || 100) / 2, (el.height || 100) / 2, (el.width || 100) / 2, (el.height || 100) / 2, 0, 0, Math.PI * 2);
      } else if (el.type === "text") {
        context.font = `${el.fontSize || 20}px ${el.fontFamily === 1 ? 'Virgil' : 'system-ui'}`;
        context.fillStyle = el.strokeColor || this.stroke || "#000000";
        context.textAlign = el.textAlign || "left";
        context.textBaseline = el.baseline || "top";

        const lines = (el.text || "").split("\n");
        lines.forEach((line: string, i: number) => {
          context.fillText(line, 0, i * (el.fontSize || 20) * 1.2);
        });
      }

      if (el.type === "line" || el.type === "arrow" || el.type === "freedraw") {
        if (el.points && el.points.length > 0) {
          context.moveTo(el.points[0][0], el.points[0][1]);
          for (let i = 1; i < el.points.length; i++) {
            context.lineTo(el.points[i][0], el.points[i][1]);
          }
        }
      }

      if (el.type !== "text") {
        if (context.fillStyle !== "transparent") context.fill();
        if (context.strokeStyle !== "transparent") context.stroke();
      }

      context.closePath();
      context.restore();
    });

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

export default ExcalidrawShape;
