import type { BoxInterface, Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import { resizeRect } from "../utils/resize";
import { calcPointWithRotation } from "../utils/utilfunc";
import Line from "./line/line";
import Path from "./paths/path";
import Shape, { type DrawProps } from "./shape";

type Props = {
  shapes: { s: Shape; oldProps?: BoxInterface }[];
};

class Group extends Shape {
  declare shapes: { s: Shape; oldProps: BoxInterface | undefined }[];
  constructor(props: ShapeProps & Props) {
    super(props);
  }

  Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
    switch (d) {
      case "tl":
        if (current.x > old.x2) {
          this.left = old.x2;
          this.width = current.x - old.x2;
        } else {
          this.left = current.x;
          this.width = old.x2 - current.x;
        }

        if (current.y > old.y2) {
          this.top = old.y2;
          this.height = current.y - old.y2;
        } else {
          this.top = current.y;
          this.height = old.y2 - current.y;
        }
        break;
      case "tr":
        if (current.x < old.x1) {
          this.left = current.x;
          this.width = old.x1 - current.x;
        } else {
          this.left = old.x1;
          this.width = current.x - old.x1;
        }

        if (current.y > old.y2) {
          this.top = old.y2;
          this.height = current.y - old.y2;
        } else {
          this.top = current.y;
          this.height = old.y2 - current.y;
        }
        break;
      case "br":
        if (current.x < old.x1) {
          this.left = current.x;
          this.width = old.x1 - current.x;
        } else {
          this.left = old.x1;
          this.width = current.x - old.x1;
        }

        if (current.y > old.y1) {
          this.top = old.y1;
          this.height = current.y - old.y1;
        } else {
          this.top = current.y;
          this.height = old.y1 - current.y;
        }
        break;
      case "bl":
        if (current.x > old.x2) {
          this.left = old.x2;
          this.width = current.x - old.x2;
        } else {
          this.left = current.x;
          this.width = old.x2 - current.x;
        }
        if (current.y > old.y1) {
          this.top = old.y1;
          this.height = current.y - old.y1;
        } else {
          this.top = current.y;
          this.height = old.y1 - current.y;
        }
    }

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
    return false;
  }

  draw(options: DrawProps): void {
    const context = this.ctx || options.ctx;

    this.shapes.forEach((s) => {
      s?.s.draw({ ctx: context });
    });
  }
}

export default Group;
