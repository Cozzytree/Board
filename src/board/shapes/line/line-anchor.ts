import Line from "./line";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import type { connectionEventData, LineProps } from "../shape_types";
import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";

class LineAnchor extends Line {
  constructor(props: ShapeProps & LineProps) {
    super(props);
    this.points = props.points || [];
  }

  protected adjustPoints(): void {
    const p1 = this.points[0];
    const p2 = this.points[this.points.length - 1];

    this.lineType = "anchor";
    this.points.length = 4;
    this.points[0] = p1;
    this.points[1] = { x: p1.x + p2.x / 2, y: p1.y };
    this.points[2] = { x: p1.x + p2.x / 2, y: p2.y };
    this.points[3] = p2;
  }

  clone(): Shape {
    const props = super.cloneProps();
    return new LineAnchor({ ...props, points: this.points });
  }

  draw({ ctx, resize }: DrawProps): void {
    const context = ctx || this.ctx;
    context.save();
    context.translate(this.left, this.top);

    if (resize) {
      context.globalAlpha = 0.5;
    }
    context.lineWidth = this.strokeWidth;
    context.strokeStyle = this.stroke;
    context.beginPath();

    context.moveTo(this.points[0].x, this.points[0].y);
    this.points.forEach((p) => {
      context.lineTo(p.x, p.y);
    });

    context.stroke();
    if (this.arrowS) {
      this.renderArrow({
        arrowLength: 10,
        ctx: context,
        endPoint: this.points[0],
        startPoint: this.points[1],
      });
    }
    if (this.arrowE) {
      this.renderArrow({
        arrowLength: 10,
        ctx: context,
        endPoint: this.points[this.points.length - 1],
        startPoint: this.points[this.points.length - 2],
      });
    }
    context.restore();
    this.renderText({ context });
  }

  Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
    const shapes = super.Resize(current, old, d);
    const maxX = Math.max(this.points[this.points.length - 1].x, this.points[0].x);
    const minX = Math.min(this.points[this.points.length - 1].x, this.points[0].x);

    const maxY = Math.max(this.points[this.points.length - 1].y, this.points[0].y);
    const minY = Math.min(this.points[this.points.length - 1].y, this.points[0].y);

    const width = maxX - minX;
    const height = maxY - minY;
    const midWidth = width / 2;
    const midHeight = height / 2;

    this.points[1] = {
      x: height > 200 ? this.points[0].x : minX + midWidth,
      y: height > 200 ? minY + midHeight : this.points[0].y,
    };
    this.points[2] = {
      x: height > 200 ? this.points[this.points.length - 1].x : minX + midWidth,
      y: height > 200 ? minY + midHeight : this.points[this.points.length - 1].y,
    };
    return shapes;
  }

  connectionEvent({ c, s, p }: connectionEventData): boolean {
    const b = super.connectionEvent({ c, s, p });
    if (b) {
      const { left, top, width, height } = s;
      const start = { x: this.left + this.points[0].x, y: this.top + this.points[0].y };
      const end = {
        x: this.left + this.points[this.points.length - 1].x,
        y: this.top + this.points[this.points.length - 1].y,
      };

      let xAlign, yAlign: boolean;
      if (c.connected === "s") {
        xAlign = end.x > left && end.x < left + width;
        yAlign = end.y > top && end.y < top + height;
      } else {
        xAlign = start.x > left && start.x < left + width;
        yAlign = start.y > top && start.y < top + height;
      }

      const midY = (this.points[0].y + this.points[this.points.length - 1].y) / 2;
      const midX = (this.points[0].x + this.points[this.points.length - 1].x) / 2;

      if (!yAlign) {
        if (c.connected === "e") {
          if (end.y > start.y) {
            this.points[this.points.length - 1] = {
              x: left + s.width / 2 - this.left,
              y: top - this.top,
            };
          } else {
            this.points[this.points.length - 1] = {
              x: left + s.width / 2 - this.left,
              y: top + s.height - this.top,
            };
          }
        } else {
          if (start.y > end.y) {
            this.points[0] = { x: left + s.width / 2 - this.left, y: top - this.top };
          } else {
            this.points[0] = {
              x: left + s.width / 2 - this.left,
              y: top + s.height - this.top,
            };
          }
        }
        this.points[1] = { y: midY, x: this.points[0].x };
        this.points[2] = { y: midY, x: this.points[this.points.length - 1].x };
      }

      if (!xAlign) {
        if (c.connected === "e") {
          if (end.x < start.x) {
            this.points[this.points.length - 1] = {
              x: left + s.width - this.left,
              y: top + height / 2 - this.top,
            };
          } else {
            this.points[this.points.length - 1] = {
              x: left - this.left,
              y: top + height / 2 - this.top,
            };
          }
        } else {
          if (end.x < start.x) {
            this.points[0] = { x: left - this.left, y: top + height / 2 - this.top };
          } else {
            this.points[0] = {
              x: left + s.width - this.left,
              y: top + height / 2 - this.top,
            };
          }
        }
        this.points[1] = { x: midX, y: this.points[0].y };
        this.points[2] = { x: midX, y: this.points[this.points.length - 1].y };
      }
    }
    return b;
  }
}

export default LineAnchor;
