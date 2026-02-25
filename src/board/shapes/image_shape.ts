import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import type { DrawProps } from "./shape";
import { isDraggableWithRotation, resizeRect } from "../utils/resize";
import { Box, Pointer, Shape } from "../index";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation } from "../utils/utilfunc";

export type ImageShapeProps = {
  imageSrc?: string;
};

class ImageShape extends Shape {
  declare imageSrc: string;
  private _img: HTMLImageElement | null = null;
  private _loaded: boolean = false;

  constructor(props: ShapeProps & ImageShapeProps) {
    super(props);
    this.imageSrc = props.imageSrc || "";
    this.type = "image";

    if (this.imageSrc) {
      this._loadImage(this.imageSrc);
    }
  }

  private _loadImage(src: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      this._img = img;
      this._loaded = true;

      // If shape has default size, use natural image size (clamped)
      if (this.width <= 4 || this.height <= 4) {
        const maxDim = 400;
        const aspect = img.naturalWidth / img.naturalHeight;
        if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
          if (aspect > 1) {
            this.width = maxDim;
            this.height = maxDim / aspect;
          } else {
            this.height = maxDim;
            this.width = maxDim * aspect;
          }
        } else {
          this.width = img.naturalWidth;
          this.height = img.naturalHeight;
        }
      }

      this._board?.render();
    };
    img.onerror = (e) => {
      console.error("Failed to load image for ImageShape", e);
    };
    img.src = src;
  }

  clone(): Shape {
    const props = super.cloneProps();
    return new ImageShape({
      ...props,
      imageSrc: this.imageSrc,
    });
  }

  mouseup(s: ShapeEventData): void {
    super.set({
      width: Math.max(this.width, 20),
      height: Math.max(this.height, 20),
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
    const context = ctx || this.ctx;
    context.save();

    const currentScale = context.getTransform().a;

    // Rotation
    const centerX = this.left + this.width * 0.5;
    const centerY = this.top + this.height * 0.5;
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);

    if (resize) {
      context.globalAlpha = this.selectionAlpha;
      context.strokeStyle = this.selectionColor;
      context.fillStyle = this.selectionFill;
      context.lineWidth = this.selectionStrokeWidth;
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

    // Draw image if loaded
    if (this._loaded && this._img) {
      context.drawImage(this._img, this.left, this.top, this.width, this.height);
    } else {
      // Placeholder while loading
      context.beginPath();
      context.rect(this.left, this.top, this.width, this.height);
      context.stroke();
      context.closePath();

      // Draw a small "image" icon placeholder
      context.fillStyle = resize ? this.selectionFill : "#88888830";
      context.fillRect(this.left, this.top, this.width, this.height);
    }

    // Border
    if (this.strokeWidth > 0 && this.stroke !== "transparent" && !resize) {
      context.beginPath();
      context.rect(this.left, this.top, this.width, this.height);
      context.stroke();
      context.closePath();
    }

    context.restore();

    if (this.text.length) {
      super.renderText({ context });
    }
  }

  IsResizable(p: Point): resizeDirection | null {
    const { height, width, top, left, rotate } = this;
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

  Resize(current: Point, old: BoxInterface, d: resizeDirection) {
    const newBounds = resizeWithRotation({
      current,
      old,
      direction: d,
      rotate: this.rotate,
      minWidth: 20,
      minHeight: 20,
    });

    const adjustedHeight = this.adjustHeight(newBounds.height);

    super.set({
      left: newBounds.left,
      top: newBounds.top,
      width: newBounds.width,
      height: adjustedHeight,
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

export default ImageShape;
