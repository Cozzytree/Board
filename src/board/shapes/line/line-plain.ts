import { Line, Shape } from "@/board/index";
import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";
import type { DrawProps } from "../shape";
import type { connectionEventData, LineProps } from "../shape_types";
import { getAnchorPoint, intersectLineWithBox } from "@/board/utils/utilfunc";

class PlainLine extends Line {
  constructor(props: ShapeProps & LineProps) {
    super(props);
  }
  clone(): Shape {
    const props = super.cloneProps();
    this.lineType = "straight";
    return new PlainLine({ ...props, points: this.points });
  }

  Resize(current: Point, _: BoxInterface, d: resizeDirection): Shape[] | void {
    const shape = super.Resize(current, _, d);
    const mid = {
      x: (this.points[0].x + this.points[this.points.length - 1].x) / 2,
      y: (this.points[0].y + this.points[this.points.length - 1].y) / 2,
    };
    if (this.lineType === "curve" && this.points.length === 4) {
      this.points[1] = {
        x: mid.x,
        y: this.points[0].y,
      };
      this.points[2] = {
        x: mid.x,
        y: this.points[this.points.length - 1].y,
      };
    } else {
      if (this.points.length > 2) {
        this.points[1] = { x: mid.x, y: mid.y };
      }
    }
    return shape;
  }

  connectionEvent({ c, s }: connectionEventData): boolean {
    const size = this.connections.size();
    const index = this.points.length - 1;

    if (size == 2) {
      const start = this.connections.getByConnection("s");
      const end = this.connections.getByConnection("e");

      if (!start || !end) return true;

      const sp = getAnchorPoint(start);
      const ep = getAnchorPoint(end);

      const startHit = intersectLineWithBox(
        ep.x,
        ep.y,
        sp.x,
        sp.y,
        start.s.left,
        start.s.left + start.s.width,
        start.s.top,
        start.s.top + start.s.height,
      );

      const endHit = intersectLineWithBox(
        sp.x,
        sp.y,
        ep.x,
        ep.y,
        end.s.left,
        end.s.left + end.s.width,
        end.s.top,
        end.s.top + end.s.height,
      );

      if (!startHit.length || !endHit.length) return true;

      // Rebuild points from scratch
      this.points = [
        {
          x: startHit[0][0] - this.left,
          y: startHit[0][1] - this.top,
        },
        {
          x: endHit[0][0] - this.left,
          y: endHit[0][1] - this.top,
        },
      ];

      return true;
    } else {
      const otherSide = c.connected == "s" ? this.points[this.points.length - 1] : this.points[0];
      const followPoint = {
        x: s.left + ((c.coords?.x ?? 0) / 100) * s.width,
        y: s.top + ((c.coords?.y ?? 0) / 100) * s.height,
      };
      const points = intersectLineWithBox(
        this.left + otherSide.x,
        this.top + otherSide.y,
        followPoint.x,
        followPoint.y,
        s.left,
        s.left + s.width,
        s.top,
        s.top + s.height,
      );
      if (points.length) {
        const changeIndex = c.connected === "s" ? 0 : index;

        if (this.points.length == 3) {
          this.points[changeIndex] = {
            x: s.left + ((c.coords?.x ?? 0) / 100) * s.width - this.left,
            y: s.top + ((c.coords?.y ?? 0) / 100) * s.height - this.top,
          };
          this.points[1] = {
            x: points[0][0] - this.left,
            y: points[0][1] - this.top,
          };
        } else {
          this.points[changeIndex] = {
            x: points[0][0] - this.left,
            y: points[0][1] - this.top,
          };
        }
      }
    }
    return true;
  }

  // draw(options: DrawProps): void {
  //   const context = options?.ctx || this.ctx;

  //   context.save();
  //   context.translate(this.left, this.top);
  //   if (options?.resize) {
  //     context.globalAlpha = 0.5;
  //   }
  //   context.strokeStyle = this.stroke;
  //   context.lineWidth = this.strokeWidth;

  //   context.beginPath();
  //   if (this.connections.size() > 0 && this.points.length === 3) {
  //     const conn = this.connections.shapes[0];
  //     const isStart = conn.connected == "s";
  //     const movePoint = isStart ? this.points[this.points.length - 1] : this.points[0];

  //     context.moveTo(movePoint.x, movePoint.y);
  //     context.lineTo(this.points[1].x, this.points[1].y);
  //   } else {
  //     context.moveTo(this.points[0].x, this.points[0].y);
  //     const mid = {
  //       x: (this.points[0].x + this.points[this.points.length - 1].x) / 2,
  //       y: (this.points[0].y + this.points[this.points.length - 1].y) / 2,
  //     };
  //     context.lineTo(mid.x, mid.y);
  //     context.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
  //   }
  //   context.stroke();

  //   context.restore();
  //   this.renderText({ context });
  // }

  draw({ ctx, resize = false }: DrawProps): void {
    if (!this.points || this.points.length < 2) return;

    const context = ctx || this.ctx;
    context.save();

    // Move into the line's local space
    context.translate(this.left, this.top);

    // Resize style
    if (resize) {
      context.globalAlpha = 0.3;
      context.setLineDash([5, 5]);
    } else {
      context.setLineDash(this.dash);
    }

    context.lineWidth = this.strokeWidth;
    context.strokeStyle = this.fill;
    context.fillStyle = this.fill;

    // Absolute (local-to-line) points
    const p0 = this.points[0];
    const p1 = this.points[this.points.length - 1];

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      context.restore();
      return;
    }

    const ux = dx / length;
    const uy = dy / length;
    const angle = Math.atan2(dy, dx);

    // -------- TEXT METRICS --------
    const hasText = this.text && this.text.length > 0;

    let gapStartDist = 0;
    let gapEndDist = length;

    if (hasText) {
      // ---- SET FONT FIRST ----
      const font = `${this.fontWeight} ${this.italic ? "italic" : ""} ${this.fontSize}px system-ui`;
      context.font = font;

      const lines = this.text.split("\n");

      // ---- MEASURE LINES ----
      const lineHeight = this.fontSize * 1.2;
      const textWidths = lines.map((l) => context.measureText(l).width);
      const maxWidth = Math.max(...textWidths);
      const totalHeight = lines.length * lineHeight;

      // ---- GAP SIZE (WIDTH ONLY) ----
      const padding = Math.max(6, this.fontSize * 0.4);
      const gapLength = maxWidth + padding;

      let anchorDist: number;

      switch (this.textAlign) {
        case "left":
          anchorDist = padding + gapLength / 2;
          break;

        case "right":
          anchorDist = length - padding - gapLength / 2;
          break;

        case "center":
        default:
          anchorDist = length / 2;
      }

      gapStartDist = Math.max(0, anchorDist - gapLength / 2);
      gapEndDist = Math.min(length, anchorDist + gapLength / 2);

      // ---- GAP POINTS ----
      const gapStart = {
        x: p0.x + ux * gapStartDist,
        y: p0.y + uy * gapStartDist,
      };

      const gapEnd = {
        x: p0.x + ux * gapEndDist,
        y: p0.y + uy * gapEndDist,
      };

      // ---- DRAW LINE WITH GAP ----
      context.beginPath();
      context.moveTo(p0.x, p0.y);
      context.lineTo(gapStart.x, gapStart.y);
      context.stroke();

      context.beginPath();
      context.moveTo(gapEnd.x, gapEnd.y);
      context.lineTo(p1.x, p1.y);
      context.stroke();

      // ---- DRAW TEXT ----
      context.save();

      // Move to center of gap
      context.translate(
        p0.x + ux * (gapStartDist + gapLength / 2),
        p0.y + uy * (gapStartDist + gapLength / 2),
      );

      // Rotate along line
      context.rotate(angle);

      // Text alignment
      context.textAlign = this.textAlign as CanvasTextAlign;
      context.textBaseline = "middle";

      // Offset text block perpendicular to line
      const blockOffset = totalHeight / 2 - lineHeight / 2;

      lines.forEach((line, i) => {
        const y = -blockOffset + i * lineHeight;
        context.fillText(line, 0, y);
      });

      context.restore();
    } else {
      // ---- SIMPLE LINE (NO TEXT) ----
      context.beginPath();
      context.moveTo(p0.x, p0.y);
      context.lineTo(p1.x, p1.y);
      context.stroke();
    }

    if (this.arrowS) {
      this.renderArrow({ arrowLength: 10, ctx: context, endPoint: p0, startPoint: p1 });
    }
    if (this.arrowE) {
      this.renderArrow({ arrowLength: 10, ctx: context, endPoint: p1, startPoint: p0 });
    }

    context.restore();
  }

  // draw({ ctx, resize = false }: DrawProps): void {
  //   if (!this.points) return;
  //   const context = ctx || this.ctx;
  //   context.save();
  //   context.translate(this.left, this.top);

  //   if (resize) {
  //     context.globalAlpha = 0.3;
  //     context.setLineDash([5, 5]);
  //   }

  //   context.lineWidth = this.strokeWidth;
  //   context.strokeStyle = this.fill;
  //   if (this.arrowS) {
  //     this.renderArrow({
  //       arrowLength: 10,
  //       ctx: context,
  //       endPoint: {
  //         x: this.points[0].x,
  //         y: this.points[0].y,
  //       },
  //       startPoint: {
  //         x: this.points[1].x,
  //         y: this.points[1].y,
  //       },
  //     });
  //   }

  //   context.setLineDash(this.dash);
  //   context.lineWidth = this.strokeWidth;
  //   context.strokeStyle = this.fill;

  //   if (this.text.length > 0) {
  //     const lines = this.text.split("\n");
  //     const longest = lines.reduce((a, b) => (a.length > b.length ? a : b));
  //     const metrics = context.measureText(longest);

  //     const x0 = this.points[0].x,
  //       y0 = this.points[0].y;
  //     const x1 = this.points[1].x,
  //       y1 = this.points[1].y;
  //     const dx = x1 - x0,
  //       dy = y1 - y0;
  //     const len = Math.hypot(dx, dy);
  //     if (len === 0) {
  //       context.beginPath();
  //       context.moveTo(x0, y0);
  //       context.lineTo(x1, y1);
  //       context.stroke();
  //     } else {
  //       const textHeight =
  //         metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
  //         metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent ||
  //         parseFloat(context.font);
  //       let gapStartDist: number, gapEndDist: number;
  //       const pad = 5 + textHeight / 2;
  //       const mid = len / 2;

  //       switch (this.textAlign) {
  //         case "left":
  //           gapStartDist = pad;
  //           gapEndDist = pad + metrics.width * 1.1;
  //           break;
  //         case "right":
  //           gapEndDist = len - pad;
  //           gapStartDist = gapEndDist - metrics.width;
  //           break;
  //         default:
  //           gapStartDist = mid - metrics.width * 1.1;
  //           gapEndDist = mid + metrics.width * 1.1;
  //           break;
  //       }

  //       const ux = dx / len,
  //         uy = dy / len;
  //       const gapStart = { x: x0 + ux * gapStartDist, y: y0 + uy * gapStartDist };
  //       const gapEnd = { x: x0 + ux * gapEndDist, y: y0 + uy * gapEndDist };

  //       // Before gap
  //       context.beginPath();
  //       context.moveTo(x0, y0);
  //       context.lineTo(gapStart.x, gapStart.y);
  //       context.stroke();
  //       context.stroke();

  //       // After gap
  //       context.beginPath();
  //       context.moveTo(gapEnd.x, gapEnd.y);
  //       context.lineTo(x1, y1);
  //       context.stroke();
  //     }
  //   } else {
  //     context.beginPath();
  //     context.moveTo(this.points[0].x, this.points[0].y);
  //     if (this.lineType === "curve") {
  //       for (let i = 1; i < this.points.length; i++) {
  //         context.quadraticCurveTo(
  //           this.points[i - 1].x,
  //           this.points[i - 1].y,
  //           this.points[i].x,
  //           this.points[i].y,
  //         );
  //       }
  //     }
  //     context.lineTo(this.points[1].x, this.points[1].y);
  //   }

  //   context.beginPath();
  //   context.moveTo(this.points[0].x, this.points[0].y);
  //   const p = this.points;

  //   if (this.lineType === "curve" && p.length === 4) {
  //     // Move to the first point
  //     context.moveTo(p[0].x, p[0].y);

  //     for (let i = 1; i < p.length - 2; i++) {
  //       const xc = (p[i].x + p[i + 1].x) * 0.5;
  //       const yc = (p[i].y + p[i + 1].y) * 0.5;
  //       context.quadraticCurveTo(p[i].x, p[i].y, xc, yc);
  //     }

  //     // Handle the last segment
  //     const penultimate = p[p.length - 2];
  //     const last = p[p.length - 1];
  //     context.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
  //   } else {
  //     // Fallback: simple line between first two points
  //     context.lineTo(p[1].x, p[1].y);
  //   }

  //   context.stroke();
  //   context.restore();
  //   if (this.text.length) {
  //     const lines = breakText({ text: this.text, ctx: context, width: this.width });
  //     super.renderText({ context, text: lines.join("\n") });
  //   }
  // }
}

export default PlainLine;
