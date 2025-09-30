import { HoveredColor } from "@/board/constants";
import type { BoxInterface, Point, resizeDirection, ShapeEventData, ShapeProps } from "../../types";
import type { connectionEventData, LineProps, LineType, Side } from "../shape_types";

import { Box, Pointer, Rect, Shape } from "@/board/index";
import {
  intersectLineWithBox,
  isPointNearSegment,
  routeOrthogonalRobustDynamic,
  setCoords,
} from "@/board/utils/utilfunc";

type Connection = {
  s: Shape;
};

abstract class Line extends Shape {
  private indicator: {
    show: boolean;
    rect: Rect;
  };
  declare lastPoints: Point[];
  protected resizeIndex: number | null = null;
  declare points: Point[];
  declare lineType: LineType;
  declare startShape: Connection | null;
  declare endShape: Connection | null;
  declare arrowS: boolean;
  declare arrowE: boolean;

  constructor(props: ShapeProps & LineProps) {
    super(props);
    this.textAlign = "center";
    this.verticalAlign = "center";
    this.type = "line";
    this.lineType = props.lineType || "straight";
    this.arrowS = true;
    this.arrowE = false;
    this.points = props.points || [];
    this.indicator = {
      rect: new Rect({
        _board: props._board,
        ctx: this._board.ctx2,
        strokeWidth: 10,
        selectionStrokeWidth: 20,
        selectionColor: "#606060",
        selectionAlpha: 0.5,
        selectionDash: [0, 0],
        rx: 2,
        ry: 2,
      }),
      show: false,
    };
  }

  private establishConnection(_: Point) {}

  mousedown(s: ShapeEventData): void {
    this.establishConnection(s.e.point);
    super.mousedown(s);
  }

  activeRect(ctx?: CanvasRenderingContext2D) {
    const context = ctx || this.ctx;
    context.save();

    const centerX = this.left + this.width * 0.5;
    const centerY = this.top + this.height * 0.5;
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);

    // Draw corner dots
    const drawDot = (cx: number, cy: number) => {
      context.beginPath();
      context.fillStyle = "black";
      context.strokeStyle = "white";
      context.lineWidth = 3;
      context.rect(cx - 3, cy - 3, 6, 6);
      context.stroke();
      context.fill();
      context.closePath();
    };

    drawDot(this.left + this.points[0].x, this.top + this.points[0].y);
    if (this.lineType === "straight" && this.connections.size() > 0 && this.points.length === 3) {
      switch (this.connections.size()) {
        case 1:
          {
            const conn = this.connections.shapes[0];
            const isStart = conn.connected === "s";
            const to = isStart ? this.points[0] : this.points[this.points.length - 1];
            context.beginPath();
            context.strokeStyle = HoveredColor;
            context.lineWidth = this.selectionStrokeWidth;
            context.moveTo(this.left + this.points[1].x, this.top + this.points[1].y);
            context.lineTo(this.left + to.x, this.top + to.y);
            context.stroke();
            context.closePath();
          }
          break;
      }
      drawDot(this.left + this.points[1].x, this.top + this.points[1].y);
    }
    drawDot(
      this.left + this.points[this.points.length - 1].x,
      this.top + this.points[this.points.length - 1].y,
    );
    context.restore();
  }

  protected adjustPoints() {}

  protected renderArrow({
    ctx,
    arrowLength,
    endPoint,
    startPoint,
  }: {
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    arrowLength: number;
    ctx: CanvasRenderingContext2D;
  }) {
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = this.strokeWidth;
    ctx.beginPath();

    // Draw the arrowhead
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);

    // First side of the arrowhead
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
      endPoint.y - arrowLength * Math.sin(angle - Math.PI / 6),
    );
    ctx.stroke();
    ctx.closePath();

    // Second side of the arrowhead
    ctx.beginPath();
    ctx.moveTo(endPoint.x, endPoint.y);
    ctx.lineTo(
      endPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
      endPoint.y - arrowLength * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
    ctx.closePath();
  }

  IsResizable(p: Point): resizeDirection | null {
    for (let i = 0; i < this.points.length; i++) {
      const dx = Math.abs(this.points[i].x + this.left - p.x);
      const dy = Math.abs(this.points[i].y + this.top - p.y);
      if (dx < this.padding && dy < this.padding) {
        this.resizeIndex = i;
        return "b";
      }
    }

    return null;
  }

  setCoords(): void {
    const { box, points } = setCoords(this.points, this.left, this.top);

    // Step 3: Set the new bounding box and points
    this.set({
      left: box.x1,
      top: box.y1,
      width: box.x2 - box.x1,
      height: box.y2 - box.y1,
      points,
    });
  }

  IsDraggable(p: Point): boolean {
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      if (
        isPointNearSegment({
          a: new Pointer({
            x: a.x + this.left - this.padding,
            y: a.y + this.top - this.padding,
          }),
          b: new Pointer({
            x: b.x + this.left - this.padding,
            y: b.y + this.top - this.padding,
          }),
          c: p,
          padding: this.padding,
        })
      ) {
        return true;
      }
    }
    return false;
  }

  dragging(current: Point, prev: Point): void {
    if (this.connections.size() > 0) return;
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;

    this.left -= dx;
    this.top -= dy;
  }

  mouseover(s: ShapeEventData): void {
    if (this.IsDraggable(s.e.point)) {
      document.body.style.cursor = "pointer";
    }
    super.emit("mouseover", s);
  }

  mouseup(s: ShapeEventData): void {
    this.setCoords();
    super.emit("mouseup", s);

    if (
      this.resizeIndex === null ||
      this.resizeIndex < 0 ||
      this.resizeIndex > this.points.length - 1
    )
      return;

    let anchor: Side = "left";
    const foundShape = this._board.shapeStore.forEach((shape) => {
      if (shape.type === "line" && shape.ID() === this.ID()) return false;

      if (this.lineType === "straight") {
        if (shape.IsDraggable(s.e.point)) {
          return true;
        }
      } else {
        const a = shape.inAnchor(s.e.point);
        if (a.isin) {
          anchor = a.side;
          return true;
        }
      }
      return false;
    });

    if (!foundShape) {
      const d: "s" | "e" = this.resizeIndex === 0 ? "s" : "e";
      this.connections.clear(d, this.ID());
      this.resizeIndex = null;

      if (this.connections.size() == 1 || this.connections.size() == 0) {
        console.log("connections adjust");
        this.adjustPoints();
      }

      return;
    }

    const coords = {
      x: ((s.e.point.x - foundShape.left) / foundShape.width) * 100,
      y: ((s.e.point.y - foundShape.top) / foundShape.height) * 100,
    };
    console.log("% ", coords);

    if (this.resizeIndex == 0) {
      // check if already connected to end
      const alreadyConnected = this.connections.forEach((connect) => {
        if (connect.s.ID() === foundShape.ID() && connect.connected === "e") return true;
        return false;
      });
      if (alreadyConnected == null) {
        this.connections.add({
          s: foundShape,
          connected: "s",
          anchor,
          index: this.resizeIndex,
        });
        foundShape.connections.add({ s: this, connected: "s", anchor, coords });
      }
    } else {
      // check if already connected to start
      const alreadyConnected = this.connections.forEach((connect) => {
        if (connect && connect.s.ID() === foundShape.ID() && connect.connected === "s") return true;
        return false;
      });
      if (alreadyConnected == null) {
        this.connections.add({
          s: foundShape,
          connected: "e",
          anchor,
          index: this.resizeIndex,
        });
        foundShape.connections.add({ s: this, connected: "e", anchor, coords });
      }
    }

    this.resizeIndex = null;
    if (this.connections.size() == 1 || this.connections.size() == 0) {
      console.log("connections adjust");
      this.adjustPoints();
    }
  }

  Resize(current: Point, _: BoxInterface, d: resizeDirection): Shape[] | void {
    const drawShapes: Shape[] = [];
    const index = d === "br" ? this.points.length - 1 : this.resizeIndex;
    if (index === null || index < 0 || index > this.points.length - 1) return;

    this.resizeIndex = index;

    const anchorDirection: { p: Point; s: Side } = { p: { x: 0, y: 0 }, s: "bottom" };

    // Reset indicator by default
    this.indicator.show = false;

    const foundShape = this._board.shapeStore.forEach((s) => {
      if (s.type === "line" || this.ID() === s.ID()) return false;
      /*
       */
      if (this.lineType == "straight") {
        if (s.IsDraggable(current)) {
          this.indicator.show = true;
          this.indicator.rect.set({
            left: s.left - s.padding,
            top: s.top - s.padding,
            width: s.width + 2 * s.padding,
            height: s.height + 2 * s.padding,
          });
          drawShapes.push(this.indicator.rect);
          return true;
        }
      } else {
        const a = s.inAnchor(current);
        if (a.isin) {
          this.indicator.show = true;
          this.indicator.rect.set({
            left: s.left - s.padding,
            top: s.top - s.padding,
            width: s.width + 2 * s.padding,
            height: s.height + 2 * s.padding,
          });

          drawShapes.push(this.indicator.rect);
          anchorDirection.s = a.side;
          anchorDirection.p = a.point;
          return true;
        }
      }
      return false;
    });

    if (foundShape) {
      if (this.lineType === "straight") {
        // reset draw shapes
        let oppositeP = index;
        if (index === 0) {
          oppositeP = this.points.length - 1;
        } else {
          oppositeP = 0;
        }
        const i = intersectLineWithBox(
          this.left + this.points[oppositeP].x,
          this.top + this.points[oppositeP].y,
          current.x,
          current.y,
          foundShape.left,
          foundShape.left + foundShape.width,
          foundShape.top,
          foundShape.top + foundShape.height,
        );
        console.log(i);
        if (i.length) {
          const intersectPoint = new Pointer({ x: i[0][0], y: i[0][1] });
          // Convert intersection point to relative coordinates within this box
          const relativeX = intersectPoint.x - this.left;
          const relativeY = intersectPoint.y - this.top;

          this.points[index] = new Pointer({ x: relativeX, y: relativeY });
        }
      } else {
        this.points[index] = {
          x: anchorDirection.p.x - this.left,
          y: anchorDirection.p.y - this.top,
        };
      }
    } else {
      this.points[index] = { x: current.x - this.left, y: current.y - this.top };
    }

    return this.indicator.show ? drawShapes : undefined;
  }

  connectionEvent({ c, s }: connectionEventData): boolean {
    const size = this.connections.size();
    if (size == 2) {
      const conn1 = this.connections.shapes[0];
      const conn2 = this.connections.shapes[1];
      /*
            start should be connection1
            */
      const start = conn1.connected == "s" ? conn1 : conn2;
      const end = conn1.connected == "e" ? conn1 : conn2;
      const box1 = new Box({
        x1: start.s.left,
        y1: start.s.top,
        x2: start.s.left + start.s.width,
        y2: start.s.top + start.s.height,
      });
      const box2 = new Box({
        x1: end.s.left,
        y1: end.s.top,
        x2: end.s.left + end.s.width,
        y2: end.s.top + end.s.height,
      });

      const points = routeOrthogonalRobustDynamic(
        { left: box1.x1, top: box1.y1, bottom: box1.y2, right: box1.x2 },
        { left: box2.x1, top: box2.y1, bottom: box2.y2, right: box2.x2 },
        30,
        start.anchor,
        end.anchor,
      );

      const relativePoints = points.map((p) => {
        return { x: p.x - this.left, y: p.y - this.top };
      });
      this.set("points", relativePoints);
      return false;
    } else {
      const absPoint = {
        x: s.left + s.width / 2,
        y: s.top + s.height / 2,
      };

      let index = 0;
      if (c.connected === "s") {
        index = this.points.length - 1;
      }

      const intersect = intersectLineWithBox(
        this.left + this.points[index].x,
        this.top + this.points[index].y,
        absPoint.x,
        absPoint.y,
        s.left,
        s.left + s.width,
        s.top,
        s.top + s.height,
      );

      if (intersect.length) {
        const relativeX = intersect[0][0] - this.left;
        const relativeY = intersect[0][1] - this.top;

        if (c.connected == "s") {
          this.points[0] = { x: relativeX, y: relativeY };
        } else {
          this.points[this.points.length - 1] = { x: relativeX, y: relativeY };
        }

        return true;
      }
      return false;
    }
  }
}

export default Line;
