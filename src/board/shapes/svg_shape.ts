import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import type { DrawProps } from "./shape";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import Box from "@/board/utils/box";
import Shape from "@/board/shapes/shape";
import { calcPointWithRotation } from "@/board/utils/utilfunc";
import { resizeWithRotationAndFlip } from "@/board/utils/resizeWithRotation";

export type SvgShapeProps = {
  svgPath?: string;
  viewBoxWidth?: number;
  viewBoxHeight?: number;
};

class SvgShape extends Shape {
  declare svgPath: string;
  declare viewBoxWidth: number;
  declare viewBoxHeight: number;
  private path2d?: Path2D;

  constructor(props: ShapeProps & SvgShapeProps) {
    super(props);
    this.svgPath = props.svgPath || "";
    this.viewBoxWidth = props.viewBoxWidth || 24;
    this.viewBoxHeight = props.viewBoxHeight || 24;
    this.type = "svg";

    // Default size to viewbox if none provided
    if (!props.width) this.width = this.viewBoxWidth;
    if (!props.height) this.height = this.viewBoxHeight;

    // Optional native image representation for complex SVGs
    if (this.svgPath && this.svgPath.startsWith("<svg")) {
      const img = new Image();
      img.onload = () => {
        // Mark as loaded so next render loop picks it up
        this._board?.render();
      };
      img.onerror = (e) => {
        console.error("Failed to load SVG Image for Canvas", e);
      };

      const encoded = encodeURIComponent(this.svgPath);
      img.src = `data:image/svg+xml;charset=utf-8,${encoded}`;
      (this as any)._svgImage = img;
    } else {
      // Fallback for simple single-path icon shapes
      this.path2d = new Path2D(this.svgPath);
    }
  }

  clone(): Shape {
    const props = super.cloneProps();
    return new SvgShape({
      ...props,
      svgPath: this.svgPath,
      viewBoxWidth: this.viewBoxWidth,
      viewBoxHeight: this.viewBoxHeight,
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

  draw({ ctx, addStyles = true, resize }: DrawProps): void {
    if (!this.svgPath) return;
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

    // Apply scaling to match the viewBox to our destination width/height
    // Apply scaling to match the viewBox to our destination width/height
    const scaleX = this.width / this.viewBoxWidth;
    const scaleY = this.height / this.viewBoxHeight;

    // Center reflection transformations if flipped
    if (this.flipX || this.flipY) {
      context.translate(this.flipX ? this.width : 0, this.flipY ? this.height : 0);
      context.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
    }

    // Draw the rich SVG image, bounded by standard left, top, width, height scale
    if ((this as any)._svgImage && (this as any)._svgImage.complete) {
      context.drawImage((this as any)._svgImage, 0, 0, this.width, this.height);
    } else if (this.path2d) {
      // Fallback for stripped path icon rendering
      context.scale(scaleX, scaleY);
      context.fill(this.path2d);
      if (this.strokeWidth > 0 && this.stroke !== "transparent") {
        context.stroke(this.path2d);
      }
    }

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
      return rs.rd;
    }
    return null;
  }

  Resize(current: Point, old: BoxInterface, d: resizeDirection) {
    // Keep aspect ratio for SVG shapes typically by holding SHIFT, but for now we'll allow freeform scaling
    // like other shapes in Board unless shift logic is added here.
    const newBounds = resizeWithRotationAndFlip({
      current,
      old,
      direction: d,
      rotate: this.rotate,
      minWidth: 10,
      minHeight: 10
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
      case "l":
      case "bl":
      case "tl":
        flipX = this.lastFlippedState.x ? localX < halfW : localX > halfW;
        break;
      case "r":
      case "br":
      case "tr":
        flipX = this.lastFlippedState.x ? localX > -halfW : localX < -halfW;
        break;
    }

    switch (d) {
      case "t":
      case "tr":
      case "tl":
        flipY = this.lastFlippedState.y ? localY < halfH : localY > halfH;
        break;
      case "b":
      case "br":
      case "bl":
        flipY = this.lastFlippedState.y ? localY > -halfH : localY < -halfH;
        break;
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

export default SvgShape;
