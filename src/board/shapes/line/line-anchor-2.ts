import type { BoxInterface, Point, resizeDirection, ShapeProps } from "@/board/types";
import type Shape from "../shape";
import type { DrawProps } from "../shape";
import type { Side, connection, connectionEventData, LineProps } from "../shape_types";
import Line from "./line";
import { rotatePoint, routeOrthogonalRobustDynamic } from "@/board/utils/utilfunc";

type RectBounds = { left: number; right: number; top: number; bottom: number };

class LineAnchor2 extends Line {
  constructor(props: ShapeProps & LineProps) {
    super(props);
    this.points = props.points || [];
    this.lineType = "anchor";
  }

  private getWorldPoint(local: Point): Point {
    return { x: this.left + local.x, y: this.top + local.y };
  }

  private setPathFromWorld(points: Point[]) {
    if (!points.length) return;

    const normalized = this.normalizePath(points);
    if (normalized.length < 2) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    normalized.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });

    this.set({
      left: minX,
      top: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      points: normalized.map((p) => ({ x: p.x - minX, y: p.y - minY })),
      rotate: 0,
    });
  }

  private normalizePath(points: Point[]): Point[] {
    const out: Point[] = [];
    const EPS = 0.001;
    for (const p of points) {
      const prev = out[out.length - 1];
      if (!prev || Math.abs(prev.x - p.x) > EPS || Math.abs(prev.y - p.y) > EPS) {
        out.push({ x: p.x, y: p.y });
      }
    }

    if (out.length < 3) return out;

    const simplified: Point[] = [out[0]];
    for (let i = 1; i < out.length - 1; i++) {
      const a = simplified[simplified.length - 1];
      const b = out[i];
      const c = out[i + 1];
      const isCollinear =
        (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) ||
        (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
      if (!isCollinear) simplified.push(b);
    }
    simplified.push(out[out.length - 1]);
    return simplified;
  }

  private boxFromShape(shape: Shape): RectBounds {
    return {
      left: shape.left,
      top: shape.top,
      right: shape.left + shape.width,
      bottom: shape.top + shape.height,
    };
  }

  private inferSide(from: Point, to: Point): Side {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
    return dy >= 0 ? "bottom" : "top";
  }

  private nudge(point: Point, side: Side, delta: number): Point {
    switch (side) {
      case "left":
        return { x: point.x - delta, y: point.y };
      case "right":
        return { x: point.x + delta, y: point.y };
      case "top":
        return { x: point.x, y: point.y - delta };
      case "bottom":
        return { x: point.x, y: point.y + delta };
    }
  }

  private getConnectedAnchor(conn: connection, otherPoint: Point): { point: Point; side: Side } {
    const side =
      conn.anchor ||
      this.inferSide(
        { x: conn.s.left + conn.s.width / 2, y: conn.s.top + conn.s.height / 2 },
        otherPoint,
      );
    const cx = conn.s.left + ((conn.coords?.x ?? 50) / 100) * conn.s.width;
    const cy = conn.s.top + ((conn.coords?.y ?? 50) / 100) * conn.s.height;

    const point: Point =
      side === "left"
        ? { x: conn.s.left, y: cy }
        : side === "right"
          ? { x: conn.s.left + conn.s.width, y: cy }
          : side === "top"
            ? { x: cx, y: conn.s.top }
            : { x: cx, y: conn.s.top + conn.s.height };

    return { point, side };
  }

  private routeOrthogonal(start: Point, end: Point, startSide: Side, endSide: Side): Point[] {
    const GAP = 20;
    const startOut = this.nudge(start, startSide, GAP);
    const endOut = this.nudge(end, endSide, GAP);
    const points: Point[] = [start, startOut];

    if (Math.abs(startOut.x - endOut.x) < 0.001 || Math.abs(startOut.y - endOut.y) < 0.001) {
      points.push(endOut);
    } else if (Math.abs(startOut.x - endOut.x) >= Math.abs(startOut.y - endOut.y)) {
      const midX = (startOut.x + endOut.x) / 2;
      points.push({ x: midX, y: startOut.y });
      points.push({ x: midX, y: endOut.y });
    } else {
      const midY = (startOut.y + endOut.y) / 2;
      points.push({ x: startOut.x, y: midY });
      points.push({ x: endOut.x, y: midY });
    }

    points.push(endOut);
    points.push(end);
    return this.normalizePath(points);
  }

  private recomputePathFromConnections() {
    const size = this.connections.size();
    if (size === 0 || this.points.length < 2) return;

    const startConn = this.connections.getByConnection("s");
    const endConn = this.connections.getByConnection("e");

    if (startConn && endConn) {
      const boxA = this.boxFromShape(startConn.s);
      const boxB = this.boxFromShape(endConn.s);
      const sideA =
        startConn.anchor ||
        this.inferSide(
          { x: (boxA.left + boxA.right) / 2, y: (boxA.top + boxA.bottom) / 2 },
          { x: (boxB.left + boxB.right) / 2, y: (boxB.top + boxB.bottom) / 2 },
        );
      const sideB =
        endConn.anchor ||
        this.inferSide(
          { x: (boxB.left + boxB.right) / 2, y: (boxB.top + boxB.bottom) / 2 },
          { x: (boxA.left + boxA.right) / 2, y: (boxA.top + boxA.bottom) / 2 },
        );

      const worldPath = routeOrthogonalRobustDynamic(boxA, boxB, 24, sideA, sideB);
      this.setPathFromWorld(worldPath);
      return;
    }

    const connected = startConn || endConn;
    if (!connected) return;

    const startWorld = this.getWorldPoint(this.points[0]);
    const endWorld = this.getWorldPoint(this.points[this.points.length - 1]);
    const freeWorld = connected.connected === "s" ? endWorld : startWorld;
    const { point: connectedPoint, side: connectedSide } = this.getConnectedAnchor(
      connected,
      freeWorld,
    );
    const freeSide = this.inferSide(freeWorld, connectedPoint);

    const worldPath =
      connected.connected === "s"
        ? this.routeOrthogonal(connectedPoint, freeWorld, connectedSide, freeSide)
        : this.routeOrthogonal(freeWorld, connectedPoint, freeSide, connectedSide);
    this.setPathFromWorld(worldPath);
  }

  private recomputePathDuringResize() {
    if (this.resizeIndex === null || this.points.length < 2) return;

    const movingIsStart = this.resizeIndex === 0;
    const startWorld = this.getWorldPoint(this.points[0]);
    const endWorld = this.getWorldPoint(this.points[this.points.length - 1]);
    const movingWorld = movingIsStart ? startWorld : endWorld;
    const fixedWorld = movingIsStart ? endWorld : startWorld;

    const fixedConn = this.connections.getByConnection(movingIsStart ? "e" : "s");

    if (fixedConn) {
      const { point: fixedAnchor, side: fixedSide } = this.getConnectedAnchor(
        fixedConn,
        movingWorld,
      );
      const movingSide = this.inferSide(movingWorld, fixedAnchor);
      const worldPath = movingIsStart
        ? this.routeOrthogonal(movingWorld, fixedAnchor, movingSide, fixedSide)
        : this.routeOrthogonal(fixedAnchor, movingWorld, fixedSide, movingSide);
      this.setPathFromWorld(worldPath);
      return;
    }

    const startSide = this.inferSide(startWorld, endWorld);
    const endSide = this.inferSide(endWorld, startWorld);
    this.setPathFromWorld(this.routeOrthogonal(startWorld, endWorld, startSide, endSide));
  }

  protected adjustPoints(): void {
    if (this.points.length < 2) return;
    const startWorld = this.getWorldPoint(this.points[0]);
    const endWorld = this.getWorldPoint(this.points[this.points.length - 1]);
    const startSide = this.inferSide(startWorld, endWorld);
    const endSide = this.inferSide(endWorld, startWorld);
    this.setPathFromWorld(this.routeOrthogonal(startWorld, endWorld, startSide, endSide));
  }

  setCoords(): void {
    // While actively resizing an endpoint, keep the dragged preview geometry.
    // Connection reassignment happens in Line.mouseup() right after this call.
    if (this.resizeIndex !== null) {
      super.setCoords();
      return;
    }

    if (this.connections.size() > 0) {
      this.recomputePathFromConnections();
      return;
    }
    super.setCoords();
  }

  clone(): Shape {
    const props = super.cloneProps();
    return new LineAnchor2({ ...props, points: this.points, lineType: "anchor" });
  }

  draw({ ctx, resize }: DrawProps): void {
    const context = ctx || this.ctx;
    context.save();

    const centerX = this.left + this.width * 0.5;
    const centerY = this.top + this.height * 0.5;
    context.translate(centerX, centerY);
    context.rotate(this.rotate);
    context.translate(-centerX, -centerY);
    context.translate(this.left, this.top);

    if (resize) {
      context.globalAlpha = 0.5;
    }

    context.lineWidth = this.strokeWidth;
    context.strokeStyle = this.stroke;
    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      context.lineTo(this.points[i].x, this.points[i].y);
    }
    context.stroke();

    if (this.arrowS && this.points.length >= 2) {
      this.renderArrow({
        arrowLength: 10,
        ctx: context,
        endPoint: this.points[0],
        startPoint: this.points[1],
      });
    }
    if (this.arrowE && this.points.length >= 2) {
      const last = this.points.length - 1;
      this.renderArrow({
        arrowLength: 10,
        ctx: context,
        endPoint: this.points[last],
        startPoint: this.points[last - 1],
      });
    }

    context.restore();
    this.renderText({ context });
  }

  Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
    const index = d === "br" ? this.points.length - 1 : this.resizeIndex;
    if (index === null || index < 0 || index > this.points.length - 1) return;
    if (index !== 0 && index !== this.points.length - 1) return;

    this.resizeIndex = index;

    let target = current;
    const hovered = this._board.shapeStore.forEach((shape) => {
      if (shape.type === "line" || shape.ID() === this.ID()) return false;
      const a = shape.inAnchor(current);
      if (!a.isin) return false;
      target = a.point;
      return true;
    });

    if (!hovered) {
      const center = { x: this.left + this.width / 2, y: this.top + this.height / 2 };
      target = this.rotate !== 0 ? rotatePoint(current, center, -this.rotate) : current;
    }

    this.points[index] = { x: target.x - this.left, y: target.y - this.top };
    this.recomputePathDuringResize();
    return;
  }

  connectionEvent(_: connectionEventData): boolean {
    if (this.resizeIndex !== null) return true;
    this.recomputePathFromConnections();
    return true;
  }
}

export default LineAnchor2;
