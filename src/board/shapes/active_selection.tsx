import type { ActiveSelectionShape } from "./shape_types";
import { Box, Ellipse, Line, Path, Shape } from "../index";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../types";
import { resizeRect, isDraggableWithRotation } from "../utils/resize";
import { resizeWithRotation } from "../utils/resizeWithRotation";
import { calcPointWithRotation } from "../utils/utilfunc";
import Group from "./group";

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
    if (setup) {
      this.setUp = setup;
    }

    if (this.shapes.length) {
      let newBox = new Box({
        x1: Infinity,
        x2: -Infinity,
        y1: Infinity,
        y2: -Infinity,
      });

      this.shapes.forEach((s) => {
        const inner = new Box({
          x1: s.s.left,
          x2: s.s.left + s.s.width,
          y1: s.s.top,
          y2: s.s.top + s.s.height,
        });
        if (s instanceof Ellipse) {
          inner.x1 = inner.x1 - s.rx;
          inner.y1 = inner.y1 - s.ry;
          inner.x2 = inner.x1 + s.width;
          inner.y2 = inner.y1 + s.height;
        }
        newBox = newBox.compareAndReturnSmall(inner);
      });
      this.left = newBox.x1 - this.padding;
      this.top = newBox.y1 - this.padding;
      this.width = newBox.x2 - newBox.x1 + this.padding * 2;
      this.height = newBox.y2 - newBox.y1 + this.padding * 2;
    }
  }

  group() {
    if (!this.shapes.length) return;

    const newGroup = new Group({
      shapes: this.shapes.map((s) => ({ s: s.s, oldProps: s.oldProps })),
      ctx: this._board.ctx,
      _board: this._board,
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

  dragging(prev: Point, current: Point) {
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;

    this.shapes.forEach((s) => {
      // guard just incase if it calls itself
      if (s?.s && this.ID() != s?.s.ID()) {
        s.s.dragging(prev, current);
        this.draw({ active: false, addStyles: false, ctx: this._board.ctx2 });
      }
    });

    this.left += dx;
    this.top += dy;

    const drg = super.dragging(prev, current);
    if (!drg) {
      return;
    }
    return [...drg, ...this.shapes.map((s) => s.s)];
  }

  draw(options: { active: boolean; ctx?: CanvasRenderingContext2D; addStyles?: boolean }): void {
    const context = options.ctx || this.ctx;
    context.save();

    const centerX = this.left + this.width * 0.5;
    const centerY = this.top + this.height * 0.5;
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);

    this.activeRect(context);
    context.restore();
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

  mouseup(s: ShapeEventData): void {
    if (this.setUp == 0) {
      this.shapes = [];
      let updateBox = new Box({
        x1: Infinity,
        x2: -Infinity,
        y1: Infinity,
        y2: -Infinity,
      });

      const outer = new Box({
        x1: this.left,
        x2: this.left + this.width,
        y1: this.top,
        y2: this.top + this.height,
      });

      this._board.shapeStore.forEach((s) => {
        const inner = new Box({
          x1: s.left,
          x2: s.left + s.width,
          y1: s.top,
          y2: s.top + s.height,
        });

        if (outer.isInOtherPartial(inner)) {
          console.log("inside");
          this.shapes.push({ s });
          updateBox = updateBox.compareAndReturnSmall(inner);
        }

        return false;
      });

      if (this.shapes.length > 1) {
        this.left = updateBox.x1 - this.padding;
        this.top = updateBox.y1 - this.padding;
        this.width = updateBox.x2 - updateBox.x1 + this.padding * 2;
        this.height = updateBox.y2 - updateBox.y1 + this.padding * 2;
        this._board.add(this);
      }
    }

    if (this.setUp <= 0) this.setUp++;
    this.emit("mouseup", s);
  }

  mousedown(e: ShapeEventData): void {
    this.emit("mousedown", e);
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
