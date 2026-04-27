import type {
  BoardInterface,
  EventData,
  modes,
  Point,
  ShapeEvent,
  submodes,
  ToolInterface,
  CustomShapeDef,
  ShapeConstructor,
} from "./types";
import {
  SelectionTool,
  Shape,
  ShapeStore,
  ActiveSelection,
  ShapeTool,
  DrawTool,
  LineTool,
  TextTool,
  Group,
} from "./index";
import EraserTool from "./tool/eraser_tool";
import ImageTool from "./tool/image_tool";
import { parseSvgToShapeProps } from "./utils/svg_parser";
import SvgShape from "./shapes/svg_shape";
type view_t = { x: number; y: number; scl: number };

type BoardProps = {
  initialShapes: any[];
  container?: HTMLElement;
  background: string;
  foreground: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  onModeChange?: (m: modes, sm: submodes) => void;
  scl?: number;
  hoverEffect?: boolean;
  snap?: boolean;
  onActiveShape?: (e: Shape | null) => void;
  onZoom?: (n: view_t) => void;
  onScroll?: (view: view_t) => void;
  customShapes?: CustomShapeDef[];
  onImageUpload?: (file: File) => Promise<string>;
  isLocked?: boolean;
};

type EventCallback = (e: EventData) => void;

class Board implements BoardInterface {
  onZoomCallback: (n: view_t) => void;
  onScroll: (view: view_t) => void;
  currentTool: ToolInterface;
  _lastMousePosition: Point = { x: 0, y: 0 };
  evt = {
    type: false,
    x: -2,
    y: -2,
    xi: 0,
    yi: 0,
    dx: 0,
    dy: 0,
    dbtn: 0,
    btn: 0,
    xbtn: 0,
    ybtn: 0,
    xusr: -2,
    yusr: -2,
    dxusr: 0,
    dyusr: 0,
    delta: 0,
    inside: false,
    hit: false,
    dscl: 1,
    eps: 5,
  };

  snap: boolean;
  hoverEffect: boolean;
  _foreground: string;
  _background: string;
  _theme: "dark" | "light" = "dark";

  get foreground(): string {
    return this._foreground;
  }

  set foreground(value: string) {
    this._foreground = value;
    this.render();
  }

  get background(): string {
    return this._background;
  }

  set background(value: string) {
    this._background = value;
    this.canvas.style.background = value;
    this.canvas.style.backgroundColor = value;
    this.render();
  }

  get theme(): "dark" | "light" {
    return this._theme;
  }

  set theme(value: "dark" | "light") {
    this._theme = value;
    this.render();
  }
  declare view: { x: number; y: number; scl: number; cartesian: boolean };
  declare activeShapes: Shape | null;
  declare shapeStore: ShapeStore<Shape>;
  declare canvas2: HTMLCanvasElement;
  declare ctx2: CanvasRenderingContext2D;

  private events: Map<ShapeEvent, Set<EventCallback>>;
  private pendingEventScheduled: boolean = false;
  private _renderDirty: boolean = false;
  private _renderRafId: number = 0;
  private handleDoubleClick: (e: PointerEvent | MouseEvent) => void;
  private handleClick: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  private handlePointerDown: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  private handlePointerMove: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  private handlePointerUp: (e: PointerEvent | MouseEvent | TouchEvent) => void;
  private handleWheel: (e: WheelEvent) => void;
  private handleTouchStart: (e: TouchEvent) => void;
  declare onModeChange?: (m: modes, sm: submodes) => void;

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  modes: { m: modes; sm: submodes | null };
  onActiveShapeCallback?: (e: Shape | null) => void;
  customShapes: Map<string, ShapeConstructor>;
  onImageUpload?: (file: File) => Promise<string>;

  constructor({
    canvas,
    width,
    scl = 1,
    height,
    onModeChange,
    background,
    foreground,
    hoverEffect,
    snap,
    onActiveShape,
    onZoom,
    onScroll,
    customShapes = [],
    onImageUpload,
    container,
    isLocked = false,
    initialShapes,
  }: BoardProps) {
    this.customShapes = new Map();
    customShapes.forEach((s) => {
      this.customShapes.set(s.name, s.shape);
    });
    this.onImageUpload = onImageUpload;
    this.onZoomCallback = (n) => {
      onZoom?.(n);
    };
    this.onScroll = (view: view_t) => {
      onScroll?.(view);
    };
    this.snap = !!snap;
    this.hoverEffect = !!hoverEffect;
    this.canvas = canvas;
    this.canvas.width = width;
    this.canvas.height = height;
    this.onModeChange = onModeChange;
    this.view = { x: 0, y: 0, scl, cartesian: false };
    this._background = background;
    this._foreground = foreground;
    this.canvas.style.background = this._background;

    this.onActiveShapeCallback = onActiveShape;
    // Ensure only one secondary canvas
    let c2 = document.getElementById("board-overlay-canvas") as HTMLCanvasElement | null;
    if (!c2) {
      c2 = document.createElement("canvas");
      c2.id = "board-overlay-canvas";
      c2.width = width;
      c2.height = height;
      c2.style.position = "absolute";
      c2.style.left = "0px";
      c2.style.top = "0px";
      c2.style.pointerEvents = "none"; // Let pointer events pass through
      if (container !== undefined) {
        container.append(c2);
      } else {
        document.body.appendChild(c2);
      }
    }

    this.canvas2 = c2;
    this.canvas2.width = width;
    this.canvas2.height = height;

    // Ensure proper z-index layering
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0px";
    this.canvas.style.top = "0px";
    this.canvas.style.zIndex = "10"; // Main canvas is on top
    // this.canvas.style.backgroundColor = "transparent"; // Transparent background
    this.canvas.style.backgroundColor = this._background;

    c2.style.zIndex = "5"; // Overlay canvas underneath

    // Get proper contexts
    const ctx = this.canvas.getContext("2d");
    const ctx2 = c2.getContext("2d");

    if (!ctx || !ctx2) throw new Error("canvas context not supported");

    this.ctx = ctx;
    this.ctx2 = ctx2;

    this.modes = { m: "cursor", sm: "free" };
    this.shapeStore = new ShapeStore();
    this.activeShapes = null;

    this.currentTool = new SelectionTool(this, "free");
    this.handleClick = this.onclick.bind(this);
    this.handlePointerDown = this.onmousedown.bind(this);
    this.handlePointerMove = this.onmousemove.bind(this);
    this.handlePointerUp = this.onmouseup.bind(this);
    this.handleWheel = this.onWheel.bind(this);
    this.handleDoubleClick = this.ondoubleclick.bind(this);
    this.handleTouchStart = this.ontouchstart.bind(this);

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (isLocked) return;
        this.handleTouchStart(e);
      },
      { passive: false },
    );
    this.canvas.addEventListener("touchmove", (e) => {
      if (isLocked) return;
      this.handlePointerMove(e);
    });
    this.canvas.addEventListener("touchend", (e) => {
      if (isLocked) return;
      this.handlePointerUp(e);
    });

    this.canvas.addEventListener("click", (e) => {
      if (isLocked) return;
      this.handleClick(e);
    });
    this.canvas.addEventListener("pointerdown", (e) => {
      if (isLocked) return;
      this.handlePointerDown(e);
    });
    // this.canvas.addEventListener("pointermove", (e) => {if (isLocked) return; this.handlePointerMove(e)});
    document.addEventListener("pointermove", (e) => {
      if (isLocked) return;
      this.handlePointerMove(e);
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (isLocked) return;
      this.handlePointerUp(e);
    });
    // document.addEventListener("pointerup", (e) => {if (isLocked) return; this.handlePointerUp(e)});
    this.canvas.addEventListener("dblclick", (e) => {
      if (isLocked) return;
      this.handleDoubleClick(e);
    });
    window.addEventListener(
      "wheel",
      (e) => {
        if (isLocked) return;
        this.handleWheel(e);
      },
      { passive: false },
    );

    this.events = new Map();
    this.render();
  }

  registerCustomShape(def: CustomShapeDef) {
    this.customShapes.set(def.name, def.shape);
  }

  registerSvgIcon(name: string, svgString: string) {
    const props = parseSvgToShapeProps(svgString);
    if (!props) return false;

    this.registerCustomShape({
      name,
      icon: svgString, // Save the raw SVG string so Toolbar can render it as a button
      shape: class extends SvgShape {
        constructor(baseProps: any) {
          super({ ...baseProps, ...props });
        }
      } as unknown as ShapeConstructor,
    });
    return true;
  }

  set setCanvasWidth(width: number) {
    this.canvas.width = width;
    this.canvas2.width = width;
  }

  set setCanvasHeight(height: number) {
    this.canvas.height = height;
    this.canvas2.height = height;
  }

  getActiveShapes(): Shape | null {
    return this.activeShapes;
  }

  set setSnap(snap: boolean) {
    this.snap = snap;
  }

  discardActiveShapes() {
    // this.shapeStore.setLastInserted = null;
    this.activeShapes = null;
    this.fire("selection:created", { e: { target: [] } });
    this.onActiveShapeCallback?.(null);
  }

  on(event: ShapeEvent, cb: (e: EventData) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)?.add(cb);
  }

  setActiveShape(...shapes: Shape[]) {
    if (shapes.length == 0) {
      this.discardActiveShapes();
      return;
    }
    if (shapes.length == 1) {
      this.discardActiveShapes();
      this.activeShapes = shapes[0];
      this.onActiveShapeCallback?.(shapes[0]);

      this.fire("selection:created", { e: { target: [this.activeShapes] } });
    } else if (shapes.length > 1) {
      this.discardActiveShapes();
      const shapesData = shapes.map((s) => ({ s }));
      const activeSelection = new ActiveSelection({
        shapes: shapesData,
        ctx: this.ctx,
        _board: this,
      });
      this.activeShapes = activeSelection;
      this.fire("selection:created", { e: { target: [this.activeShapes] } });
      this.onActiveShapeCallback?.(activeSelection);
    }
  }

  removeActiveSelectionOnly() {
    const sel = this.getActiveShapes();
    if (!(sel instanceof ActiveSelection)) return;

    const shapes = sel.shapes;
    sel.shapes = [];
    this.removeShape(sel);
    return shapes;
  }

  removeShape(...shapes: Shape[]): number {
    const idsToRemove = new Set<string>();
    const targets: Shape[] = [];

    const collect = (shape: Shape) => {
      if (idsToRemove.has(shape.ID())) return;
      idsToRemove.add(shape.ID());
      targets.push(shape);
    };

    shapes.forEach((s) => {
      if (s instanceof ActiveSelection && s.type === "selection") {
        s.shapes.forEach((as) => collect(as.s));
      }
      if (s instanceof Group) {
        // Cascade: also remove all member shapes
        s.shapes.forEach(({ s: member }) => collect(member));
      }
      collect(s);
    });

    // First detach both directions from each target's known connections.
    targets.forEach((shape) => {
      shape.connections?.forEach((conn) => {
        conn.s.connections?.delete(shape.ID());
        return false;
      });
      shape.connections?.delete(shape.ID());
    });

    // Defensive cleanup: if any remaining shapes still reference removed ids, drop them.
    this.shapeStore.forEach((shape) => {
      idsToRemove.forEach((id) => {
        shape.connections?.delete(id);
      });
      return false;
    });

    let count = 0;
    idsToRemove.forEach((id) => {
      if (this.shapeStore.removeById(id)) count++;
    });

    this.fire("shape:delete", { e: { target: targets } });

    this.discardActiveShapes();
    this.shapeStore.setLastInserted = null;
    this.render();

    // clear secondary canvas
    // this.ctx2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);
    return count;
  }

  add(...shapes: Shape[]) {
    const lastInserted = this.shapeStore.getLastInsertedShape();
    if (lastInserted?.type === "selection") {
      this.shapeStore.removeById(lastInserted.ID());
    }

    this.shapeStore.insert(...shapes);

    this.adjustBox(shapes[shapes.length - 1]);

    this.discardActiveShapes();
    this.fire("shape:created", { e: { target: shapes } });
    this.setActiveShape(...shapes);
  }

  adjustBox(shape: Shape) {
    const scale = this.view.scl;

    const viewLeft = -this.view.x / scale;
    const viewTop = -this.view.y / scale;
    const viewRight = viewLeft + this.canvas.width / scale;
    const viewBottom = viewTop + this.canvas.height / scale;

    const shapeLeft = shape.left;
    const shapeTop = shape.top;
    const shapeRight = shape.left + shape.width;
    const shapeBottom = shape.top + shape.height;

    /* ---- X ---- */
    if (shapeRight > viewRight) {
      this.view.x -= (shapeRight - viewRight) * scale;
    }

    if (shapeLeft < viewLeft) {
      this.view.x += (viewLeft - shapeLeft) * scale;
    }

    /* ---- Y ---- */
    if (shapeBottom > viewBottom) {
      this.view.y -= (shapeBottom - viewBottom) * scale;
    }

    if (shapeTop < viewTop) {
      this.view.y += (viewTop - shapeTop) * scale;
    }
  }

  private setTool(tool: ToolInterface) {
    if (this.currentTool?.cleanUp) this.currentTool.cleanUp();
    this.currentTool = tool;
  }

  private throttledPointerMove = (e: PointerEvent | MouseEvent | TouchEvent) => {
    const prevDx = this.evt.dx;
    const prevDy = this.evt.dy;
    const mouse = this.getTransFormedCoords(e);
    this.evt.dx = prevDx + (this.evt.x - this.evt.xi);
    this.evt.dy = prevDy + (this.evt.y - this.evt.yi);

    if (!this.pendingEventScheduled) {
      this.pendingEventScheduled = true;
      requestAnimationFrame(() => {
        this.currentTool.pointermove({ e, p: mouse }, (e) => {
          this.fire("mousemove", e);
        });
        this.evt.dx = 0;
        this.evt.dy = 0;
        this.pendingEventScheduled = false;
      });
    }
  };

  render() {
    if (this._renderDirty) return; // Already scheduled
    this._renderDirty = true;
    this._renderRafId = requestAnimationFrame(() => {
      this._renderDirty = false;
      this._drawFrame();
    });
  }

  /** Force an immediate synchronous render (used by wheel/zoom where latency matters) */
  renderImmediate() {
    if (this._renderDirty) {
      cancelAnimationFrame(this._renderRafId);
      this._renderDirty = false;
    }
    this._drawFrame();
  }

  /** Internal: actual draw logic */
  private _drawFrame() {
    const { ctx, canvas, view, shapeStore, activeShapes } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute world-space viewport
    const viewLeft = -view.x / view.scl;
    const viewTop = -view.y / view.scl;
    const viewRight = viewLeft + canvas.width / view.scl;
    const viewBottom = viewTop + canvas.height / view.scl;

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scl, view.scl);

    shapeStore.forEach((s) => {
      // Skip shapes owned by a group — the group renders them
      if (s.groupId) return false;

      const { x, y, width, height } = s.getBounds();

      // AABB viewport culling
      if (x + width < viewLeft || x > viewRight || y + height < viewTop || y > viewBottom) {
        return false;
      }

      s.draw({});
      return false;
    });

    if (activeShapes) {
      activeShapes.activeRect(ctx);
    }
    ctx.restore();
  }

  private onmousedown(e: PointerEvent | MouseEvent | TouchEvent) {
    // Ignore right-click (mouse only)
    if ((e instanceof MouseEvent || e instanceof PointerEvent) && e.button === 2) {
      return;
    }
    const p = this.getTransFormedCoords(e);
    this.currentTool.pointerDown({ e, p }, (e) => {
      this.events.get("mousedown")?.forEach((cb) => {
        cb(e);
      });
    });
  }

  private ontouchstart(e: TouchEvent) {
    if (e.touches.length >= 2) {
      e.preventDefault();
    }
    if (this.currentTool && typeof (this.currentTool as any).touchStart === "function") {
      (this.currentTool as any).touchStart(e);
    }
  }

  private onmousemove(e: PointerEvent | MouseEvent | TouchEvent) {
    e.preventDefault();
    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && e.touches.length >= 2) {
      if (typeof (this.currentTool as any).touchMove === "function") {
        (this.currentTool as any).touchMove(e);
        return;
      }
    }
    this.throttledPointerMove(e);
  }

  private onmouseup(e: PointerEvent | MouseEvent | TouchEvent) {
    if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
      if (typeof (this.currentTool as any).touchEnd === "function") {
        (this.currentTool as any).touchEnd(e);
      }
      if (e.touches.length >= 1) return; // still multi-touch in progress
    }
    const p = this.getTransFormedCoords(e);
    this.currentTool.pointerup(
      { e, p },
      (v) => {
        this.setMode = { m: v.mode, sm: v.submode };
      },
      (e) => {
        this.events.get("mouseup")?.forEach((cb) => {
          cb(e);
        });
      },
    );
  }

  private ondoubleclick(e: PointerEvent | MouseEvent) {
    const p = this.getTransFormedCoords(e);

    this.currentTool.dblClick({ e, p });
  }

  private onclick(e: PointerEvent | MouseEvent | TouchEvent) {
    const p = this.getTransFormedCoords(e);
    this.currentTool.onClick({ e, p });
  }

  setCursor(cursor: string) {
    this.canvas.style.cursor = cursor;
    this.canvas2.style.cursor = cursor;
    document.body.style.cursor = cursor;
  }

  set setMode({ m, sm, originUi = false }: { m: modes; sm: submodes | null; originUi?: boolean }) {
    if (m === "cursor") {
      this.setTool(new SelectionTool(this, sm || "free"));
    } else if (m === "shape") {
      this.setTool(new ShapeTool(this, sm || "rect"));
    } else if (m === "draw") {
      this.setTool(new DrawTool(this));
    } else if (m === "line") {
      this.discardActiveShapes();
      this.setTool(new LineTool(this));
    } else if (m === "text") {
      this.setTool(new TextTool(this));
    } else if (m === "eraser") {
      this.setTool(new EraserTool(this));
    } else if (m === "image") {
      this.setTool(new ImageTool(this, this.onImageUpload));
    }

    this.modes = { m, sm };

    // Update cursor to reflect active mode
    const cursorMap: Record<string, string> = {
      cursor: sm === "grab" ? "grab" : "default",
      shape: "crosshair",
      draw: "crosshair",
      line: "crosshair",
      text: "text",
      eraser: "cell",
      image: "copy",
    };
    this.setCursor(cursorMap[m] || "default");

    if (!originUi) {
      this.onModeChange?.(m, sm || "free");
    }
  }

  getTransFormedCoords(e: MouseEvent | PointerEvent | WheelEvent | TouchEvent) {
    // 1. Grab the canvas's screen-space position.
    const rect = this.canvas.getBoundingClientRect() || { left: 0, top: 0 };
    let clientX,
      clientY,
      btn = 0;

    if ("touches" in e && e.touches.length > 0) {
      const t = e.touches[0];
      clientX = t.clientX;
      clientY = t.clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
      btn =
        (e as MouseEvent).buttons !== undefined
          ? (e as MouseEvent).buttons
          : (e as MouseEvent).button;
    }

    // 2. Adjust for the canvas's position on the screen.
    const rawX = clientX - Math.floor(rect.left);
    const rawY = clientY - Math.floor(rect.top);

    this.evt.xi = this.evt.x;
    this.evt.yi = this.evt.y;
    this.evt.dx = this.evt.dy = 0;
    this.evt.x = rawX;
    this.evt.y = this.view.cartesian ? this.ctx.canvas.height - rawY : rawY;
    this.evt.xusr = (this.evt.x - this.view.x) / this.view.scl;
    this.evt.yusr = (this.evt.y - this.view.y) / this.view.scl;
    this.evt.dxusr = this.evt.dyusr = 0;
    this.evt.dbtn = btn - this.evt.btn;
    this.evt.btn = btn - this.evt.btn;
    if (e.type === "wheel") {
      const we = e as WheelEvent;
      this.evt.delta = Math.max(-1, Math.min(1, we.deltaY)) || 0;
    }
    if (this.isDefaultPreventer(e.type as keyof HTMLElementEventMap)) e.preventDefault();

    return { x: (rawX - this.view.x) / this.view.scl, y: (rawY - this.view.y) / this.view.scl };
  }

  fire(e: ShapeEvent, d: EventData) {
    this.events.get(e)?.forEach((cb) => cb(d));
  }

  clean() {
    this.canvas.removeEventListener("touchstart", this.handleTouchStart);
    this.canvas.removeEventListener("touchmove", this.handlePointerMove);
    this.canvas.removeEventListener("touchend", this.handlePointerUp);

    this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    // this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    document.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("wheel", this.handleWheel);
    if (this.currentTool) {
      this.currentTool.cleanUp();
    }

    // Clear both canvases so stale pixels don't persist on re-creation
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);

    this.canvas2.remove();
    this.events.clear();
    if (this._renderDirty) {
      cancelAnimationFrame(this._renderRafId);
    }

    this.shapeStore.forEach((s) => {
      s.clean();
      return false;
    });
  }

  private isDefaultPreventer(type: keyof HTMLElementEventMap): boolean {
    const preventList: (keyof HTMLElementEventMap)[] = [
      "pointermove",
      "pointerdown",
      "pointerup",
      "wheel",
    ];
    return preventList.includes(type);
  }

  private onWheel(e: WheelEvent) {
    if (!e.ctrlKey) {
      this.view.y = e.deltaY > 0 ? this.view.y - 80 : this.view.y + 80;
    } else {
      e.preventDefault();

      // updated scale
      this.evt.dscl = e.deltaY > 0 ? 8 / 10 : 10 / 8;
      this.evt.eps /= this.evt.dscl;
      this.view.x = e.x + this.evt.dscl * (this.view.x - e.x);
      this.view.y = e.y + this.evt.dscl * (this.view.y - e.y);
      this.view.scl *= this.evt.dscl;
      this.onZoomCallback(this.view);
    }
    this.renderImmediate();
    this.onScroll(this.view);
  }
}

export default Board;
