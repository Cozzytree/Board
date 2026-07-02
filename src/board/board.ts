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
import SelectionTool from "./tool/selection_tool.tsx";
import DrawTool from "./tool/draw_tool.tsx";
import TextTool from "./tool/text_tool.ts";
import LineTool from "./tool/line_tool.ts";
import FrameTool from "./tool/frame_tool.tsx";
import ShapeTool from "./tool/shape_tool.tsx";
import Shape from "./shapes/shape.ts";
import ActiveSelection from "./shapes/active_selection.tsx";
import Group from "./shapes/group.ts";
import EraserTool from "./tool/eraser_tool";
import ImageTool from "./tool/image_tool";
import { parseSvgToShapeProps } from "./utils/svg_parser";
import SvgShape from "./shapes/svg_shape";
import ShapeStoreArr from "./shapes/shape_store_arr";
type view_t = { x: number; y: number; scl: number };
import { INDICATOR_COLOR } from "./constants";

type BoardProps = {
   snapGrid?: boolean;
   indicatorColor?: string;
   scrollEase?: number;
   initialShapes: any[];
   container?: HTMLElement;
   background: string;
   foreground: string;
   canvas: HTMLCanvasElement;
   canvas2: HTMLCanvasElement;
   canvasRemote?: HTMLCanvasElement | null;
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
   snapGrid: boolean;
   indicatorColor: string;
   onZoomCallback: (n: view_t) => void;
   onScroll: (view: view_t) => void;
   currentTool: ToolInterface;
   isLocked: boolean;
   remoteSelections: Map<number, { color: string; shapeIds: string[] }> = new Map();
   _lastMousePosition: Point = { x: 0, y: 0 };
   throttlePointer: boolean = false;
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
   declare shapeStore: ShapeStoreArr<Shape>;
   declare canvas2: HTMLCanvasElement;
   declare ctx2: CanvasRenderingContext2D;
   declare canvasRemote: HTMLCanvasElement | null;
   declare ctxRemote: CanvasRenderingContext2D | null;
   declare scrollEase: number;

   private events: Map<ShapeEvent, Set<EventCallback>>;
   private pendingEventScheduled: boolean = false;
   private _renderDirty: boolean = false;
   private _renderRafId: number = 0;
   private handleDoubleClick: (e: PointerEvent | MouseEvent) => void;
   private handleClick: (e: PointerEvent | MouseEvent | TouchEvent) => void;
   private handlePointerDown: (e: PointerEvent | MouseEvent | TouchEvent) => void;
   private handlePointerMove: (e: PointerEvent | MouseEvent | TouchEvent) => void;
   private handlePointerUp: (e: PointerEvent | MouseEvent | TouchEvent) => void;
   private handleWheel: (e: WheelEvent | Event) => void;
   private handleTouchStart: (e: TouchEvent) => void;
   declare onModeChange?: (m: modes, sm: submodes) => void;
   private targetView = { x: 0, y: 0, scl: 1 };
   private isAnimating = false;

   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   cssWidth: number;
   cssHeight: number;
   modes: { m: modes; sm: submodes | null };
   onActiveShapeCallback?: (e: Shape | null) => void;
   customShapes: Map<string, ShapeConstructor>;
   onImageUpload?: (file: File) => Promise<string>;

   getCanvasDpr() {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      // Use full resolution for normal viewing or zooming in
      if (this.view.scl >= 0.75) {
         return dpr;
      }

      // Use fixed steps so we aren't constantly resizing the DOM canvas during continuous zooming out!
      // if (this.view.scl < 0.15) return dpr * 0.15;
      if (this.view.scl < 0.3) return dpr * 0.3;
      if (this.view.scl < 0.4) return dpr * 0.4;
      if (this.view.scl < 0.5) return dpr * 0.5;
      if (this.view.scl < 0.55) return dpr * 0.55;
      if (this.view.scl < 0.65) return dpr * 0.65;

      return dpr * 0.75;
   }

   syncCanvasResolution() {
      if (!this.ctx || !this.ctx2) return;
      const currentDpr = this.getCanvasDpr();
      const targetWidth = Math.floor(this.cssWidth * currentDpr);
      const targetHeight = Math.floor(this.cssHeight * currentDpr);

      // Only resize if necessary (resizing canvas clears it and is an expensive DOM operation)
      if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
         this.canvas.width = targetWidth;
         this.canvas.height = targetHeight;
         this.canvas2.width = targetWidth;
         this.canvas2.height = targetHeight;
         if (this.canvasRemote) {
            this.canvasRemote.width = targetWidth;
            this.canvasRemote.height = targetHeight;
         }
      }

      // Apply pixelated rendering if zoomed out
      const isPixelated = this.view.scl < 0.5;
      const imageRendering = isPixelated ? "pixelated" : "auto";

      if (this.canvas.style.imageRendering !== imageRendering) {
         this.canvas.style.imageRendering = imageRendering;
         this.canvas2.style.imageRendering = imageRendering;
         if (this.canvasRemote) {
            this.canvasRemote.style.imageRendering = imageRendering;
         }
      }

      // Also apply to context directly
      this.ctx.imageSmoothingEnabled = !isPixelated;
      this.ctx2.imageSmoothingEnabled = !isPixelated;
      if (this.ctxRemote) {
         this.ctxRemote.imageSmoothingEnabled = !isPixelated;
      }
   }

   resetContextTransform(context: CanvasRenderingContext2D) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = this.getCanvasDpr();
      context.scale(dpr, dpr);
   }

   constructor({
      scrollEase,
      canvas,
      canvas2,
      canvasRemote,
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
      isLocked = false,
      snapGrid = false,
      indicatorColor
   }: BoardProps) {
      this.snapGrid = snapGrid,
         this.indicatorColor = indicatorColor || INDICATOR_COLOR;
      this.isLocked = isLocked;
      this.scrollEase = scrollEase ?? 0.5;
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
      this.cssWidth = width;
      this.cssHeight = height;
      this.onModeChange = onModeChange;
      this.view = { x: 0, y: 0, scl, cartesian: false };
      this._background = background;
      this._foreground = foreground;
      this.canvas.style.background = this._background;

      this.onActiveShapeCallback = onActiveShape;

      if (!canvas2) {
         throw new Error("canvas2 was not provided to Board constructor");
      }

      this.canvas2 = canvas2;
      this.canvasRemote = canvasRemote || null;
      this.syncCanvasResolution();

      // Ensure main canvas has transparent or specific background
      this.canvas.style.backgroundColor = this._background;

      // Get proper contexts
      const ctx = this.canvas.getContext("2d");
      const ctx2 = this.canvas2.getContext("2d");

      if (!ctx || !ctx2) throw new Error("canvas context not supported");

      this.ctx = ctx;
      this.ctx2 = ctx2;
      this.ctxRemote = this.canvasRemote ? this.canvasRemote.getContext("2d") : null;

      this.modes = { m: "cursor", sm: "free" };
      this.shapeStore = new ShapeStoreArr();
      this.activeShapes = null;

      this.currentTool = new SelectionTool(this, "free");
      this.handleClick = this.onclick.bind(this);
      this.handlePointerDown = this.onmousedown.bind(this);
      this.handlePointerMove = this.onmousemove.bind(this);
      this.handlePointerUp = this.onmouseup.bind(this);
      this.handleWheel = this.onWheel.bind(this);
      this.handleDoubleClick = this.ondoubleclick.bind(this);
      this.handleTouchStart = this.ontouchstart.bind(this);

      this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
      this.canvas.addEventListener("touchmove", this.handlePointerMove, { passive: false });
      this.canvas.addEventListener("touchend", this.handlePointerUp);

      this.canvas.addEventListener("click", this.handleClick);
      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      document.addEventListener("pointermove", this.handlePointerMove);
      // this.canvas.addEventListener("pointerup", this.handlePointerUp);
      document.addEventListener("pointerup", this.handlePointerUp);
      this.canvas.addEventListener("dblclick", this.handleDoubleClick);
      window.addEventListener("wheel", this.handleWheel, { passive: false });

      this.events = new Map();
      this.render();
   }

   setZOrder(shape: Shape, zOrder: number) {
      if (this.shapeStore.setZOrder(shape.ID(), zOrder)) {
         this.fire("shape:updated", { e: { target: [shape] } });
         this.render();
      }
   }

   bringForward(shape: Shape) {
      if (this.shapeStore.bringForward(shape.ID())) {
         this.fire("shape:updated", { e: { target: [shape] } });
         this.render();
      }
   }

   sendBackward(shape: Shape) {
      if (this.shapeStore.sendBackward(shape.ID())) {
         this.fire("shape:updated", { e: { target: [shape] } });
         this.render();
      }
   }

   bringToFront(shape: Shape) {
      if (this.shapeStore.bringToFront(shape.ID())) {
         this.fire("shape:updated", { e: { target: [shape] } });
         this.render();
      }
   }

   sendToBack(shape: Shape) {
      if (this.shapeStore.sendToBack(shape.ID())) {
         this.fire("shape:updated", { e: { target: [shape] } });
         this.render();
      }
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

   async renderRemoteSelectionsAsync() {
      if (!this.ctxRemote) return;

      // Yield to macrotask/microtask to avoid blocking main thread
      await new Promise((resolve) => requestAnimationFrame(resolve));

      this.resetContextTransform(this.ctxRemote);
      this.ctxRemote.clearRect(0, 0, this.cssWidth, this.cssHeight);

      const { view, ctxRemote } = this;

      const viewLeft = -view.x / view.scl;
      const viewTop = -view.y / view.scl;
      const viewRight = viewLeft + this.cssWidth / view.scl;
      const viewBottom = viewTop + this.cssHeight / view.scl;

      const localActiveShapeIds = new Set<string>();
      if (this.activeShapes) {
         if (this.activeShapes.type === "selection") {
            (this.activeShapes as any).shapes?.forEach((item: any) => {
               if (item?.s?.ID) localActiveShapeIds.add(item.s.ID());
            });
         } else if (this.activeShapes.ID) {
            localActiveShapeIds.add(this.activeShapes.ID());
         }
      }

      ctxRemote.save();
      ctxRemote.translate(view.x, view.y);
      ctxRemote.scale(view.scl, view.scl);

      this.remoteSelections.forEach(({ color, shapeIds }) => {
         if (shapeIds.length === 0) return;

         let minX = Infinity;
         let minY = Infinity;
         let maxX = -Infinity;
         let maxY = -Infinity;
         let foundAny = false;

         for (const id of shapeIds) {
            if (localActiveShapeIds.has(id)) continue;

            const shape = this.shapeStore.get(id);
            if (!shape) continue;
            foundAny = true;
            const bounds = shape.getBounds();
            if (bounds.x < minX) minX = bounds.x;
            if (bounds.y < minY) minY = bounds.y;
            if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
            if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
         }

         if (!foundAny) return;

         const x = minX;
         const y = minY;
         const width = maxX - minX;
         const height = maxY - minY;

         // AABB viewport culling for remote selections
         if (x + width < viewLeft || x > viewRight || y + height < viewTop || y > viewBottom) {
            return;
         }

         ctxRemote.save();
         ctxRemote.strokeStyle = color;
         ctxRemote.lineWidth = 1.5 / view.scl; // Keep stroke size visually consistent despite zoom
         ctxRemote.setLineDash([5 / view.scl, 5 / view.scl]);
         ctxRemote.beginPath();
         ctxRemote.rect(x - 2, y - 2, width + 4, height + 4);
         ctxRemote.stroke();
         ctxRemote.restore();
      });

      ctxRemote.restore();
   }

   private drawGrid(ctx: CanvasRenderingContext2D, view: { x: number, y: number, scl: number }, viewLeft: number, viewTop: number, viewRight: number, viewBottom: number) {
      const baseGridSizeX = 20;
      const baseGridSizeY = 20;
      let scaleMultiplier = 1;
      if (view.scl < 0.5) scaleMultiplier = 2;
      if (view.scl < 0.25) scaleMultiplier = 4;
      if (view.scl < 0.1) scaleMultiplier = 8;

      const gridSizeX = baseGridSizeX * scaleMultiplier;
      const gridSizeY = baseGridSizeY * scaleMultiplier;
      const majorGridX = gridSizeX * 6; // 6 subdivisions horizontally
      const majorGridY = gridSizeY * 5; // 5 subdivisions vertically

      const startX = Math.floor(viewLeft / gridSizeX) * gridSizeX;
      const startY = Math.floor(viewTop / gridSizeY) * gridSizeY;

      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scl, view.scl);

      ctx.strokeStyle = this.foreground;

      // Minor grid (dashed lines)
      ctx.beginPath();
      ctx.lineWidth = 1 / view.scl;
      ctx.globalAlpha = 0.15;
      ctx.setLineDash([4 / view.scl, 4 / view.scl]);

      for (let x = startX; x < viewRight; x += gridSizeX) {
         const modX = Math.abs(x % majorGridX);
         const isMajor = modX < 0.1 || Math.abs(modX - majorGridX) < 0.1;
         if (isMajor) continue;
         ctx.moveTo(x, viewTop);
         ctx.lineTo(x, viewBottom);
      }
      for (let y = startY; y < viewBottom; y += gridSizeY) {
         const modY = Math.abs(y % majorGridY);
         const isMajor = modY < 0.1 || Math.abs(modY - majorGridY) < 0.1;
         if (isMajor) continue;
         ctx.moveTo(viewLeft, y);
         ctx.lineTo(viewRight, y);
      }
      ctx.stroke();

      // Major grid (solid lines)
      ctx.beginPath();
      ctx.lineWidth = (1 / view.scl) % 2;
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([]); // solid

      const startMajorX = Math.floor(viewLeft / majorGridX) * majorGridX;
      const startMajorY = Math.floor(viewTop / majorGridY) * majorGridY;

      for (let x = startMajorX; x < viewRight; x += majorGridX) {
         ctx.moveTo(x, viewTop);
         ctx.lineTo(x, viewBottom);
      }
      for (let y = startMajorY; y < viewBottom; y += majorGridY) {
         ctx.moveTo(viewLeft, y);
         ctx.lineTo(viewRight, y);
      }
      ctx.stroke();

      ctx.restore();
   }

   /** Internal: actual draw logic */
   private _drawFrame() {
      this.syncCanvasResolution();
      this.renderRemoteSelectionsAsync();
      this.resetContextTransform(this.ctx);
      this.resetContextTransform(this.ctx2);

      const { view, ctx, ctx2, shapeStore, activeShapes } = this;
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
      ctx2.clearRect(0, 0, this.cssWidth, this.cssHeight);

      // We still want to cull based on CSS bounds, mapped to world space
      const viewLeft = -view.x / view.scl;
      const viewTop = -view.y / view.scl;
      const viewRight = viewLeft + this.cssWidth / view.scl;
      const viewBottom = viewTop + this.cssHeight / view.scl;

      if (this.snapGrid) {
         this.drawGrid(ctx, view, viewLeft, viewTop, viewRight, viewBottom);
      }

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
      if (this.isLocked) return;
      // Ignore right-click (mouse only)
      if ((e instanceof MouseEvent || e instanceof PointerEvent) && e.button === 2) {
         return;
      }
      const p = this.getTransFormedCoords(e);
      this.syncView();
      this.currentTool.pointerDown({ e, p }, (e) => {
         this.events.get("mousedown")?.forEach((cb) => {
            cb(e);
         });
      });
   }

   /** Stops any active scroll/zoom momentum and syncs the target view */
   syncView() {
      this.targetView.x = this.view.x;
      this.targetView.y = this.view.y;
      this.targetView.scl = this.view.scl;
      this.isAnimating = false;
   }

   private ontouchstart(e: TouchEvent) {
      if (this.isLocked) return;
      if (e.touches.length === 2) {
         e.preventDefault();
      }
      if (this.currentTool && typeof (this.currentTool as any).touchStart === "function") {
         (this.currentTool as any).touchStart(e);
      }
   }

   private onmousemove(e: PointerEvent | MouseEvent | TouchEvent) {
      if (this.isLocked) return;

      if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent) {
         if (e.cancelable) {
            e.preventDefault(); // Prevents pull-to-refresh and scroll takeover
         }
      }

      if (!this.throttlePointer) {
         this.throttledPointerMove(e);
         this.throttlePointer = true;
      }
      if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && e.touches.length >= 2) {
         if (typeof (this.currentTool as any).touchMove === "function") {
            (this.currentTool as any).touchMove(e);
            return;
         }
      }
      this.throttledPointerMove(e);
   }

   private onmouseup(e: PointerEvent | MouseEvent | TouchEvent) {
      if (this.isLocked) return;
      this.syncView();
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

   private ondoubleclick(e: MouseEvent | PointerEvent | TouchEvent) {
      if (this.isLocked) return;
      const p = this.getTransFormedCoords(e);
      this.currentTool.dblClick({ e, p });
   }

   private onclick(e: PointerEvent | MouseEvent | TouchEvent) {
      if (this.isLocked) return;
      this.syncView();
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
      } else if (m === "frame") {
         this.setTool(new FrameTool(this))
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

      if ("touches" in e) {
         const touchEvent = e as TouchEvent;
         const t = touchEvent.touches.length > 0
            ? touchEvent.touches[0]
            : (touchEvent.changedTouches && touchEvent.changedTouches.length > 0 ? touchEvent.changedTouches[0] : null);

         if (t) {
            clientX = t.clientX;
            clientY = t.clientY;
         } else {
            clientX = 0;
            clientY = 0;
         }
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
      // this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      document.removeEventListener("pointerup", this.handlePointerUp);
      window.removeEventListener("wheel", this.handleWheel);
      if (this.currentTool) {
         this.currentTool.cleanUp();
      }

      // Clear both canvases so stale pixels don't persist on re-creation
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx2.clearRect(0, 0, this.canvas2.width, this.canvas2.height);

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

   private onWheel(e: WheelEvent | Event) {
      const target = e.target as HTMLElement;


      if (this.isLocked) return;
      // Calculate cursor position in original CSS pixels relative to top-left of canvas
      const rawX = (e as WheelEvent).offsetX;
      const rawY = (e as WheelEvent).offsetY;

      if (!(e as WheelEvent).ctrlKey) {
         if (target.tagName !== "CANVAS") return;
         this.view.y = (e as WheelEvent).deltaY > 0 ? this.view.y - 80 : this.view.y + 80;
      } else {
         e.preventDefault();

         if (target.tagName !== "CANVAS") return;
         // this.evt.dscl = e.deltaY > 0 ? 8 / 10 : 10 / 8;
         const dscl = (e as WheelEvent).deltaY > 0 ? 8 / 10 : 10 / 8;

         if (this.view.scl * dscl < 0.1 || this.view.scl * dscl > 5) {
            return;
         }

         this.evt.eps /= dscl;
         this.view.x = rawX + dscl * (this.view.x - rawX);
         this.view.y = rawY + dscl * (this.view.y - rawY);
         this.view.scl *= dscl;
         this.onZoomCallback(this.view);
      }
      this.render();
      this.onScroll(this.view);
   }

   private onWheelSmooth(e: WheelEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName !== "CANVAS") return;

      // Sync targetView with any external mutations (e.g. space+drag or reset)
      if (!this.isAnimating) {
         this.targetView.x = this.view.x;
         this.targetView.y = this.view.y;
         this.targetView.scl = this.view.scl;
      }

      if (!e.ctrlKey) {
         // Smooth Pan
         this.targetView.y = e.deltaY > 0 ? this.targetView.y - 80 : this.targetView.y + 80;
      } else {
         e.preventDefault();
         // Calculate zoom factor
         const dscl = e.deltaY > 0 ? 8 / 10 : 10 / 8;

         if (this.targetView.scl * dscl < 0.1 || this.targetView.scl * dscl > 5) {
            return;
         }

         // Update TARGET view (zoom towards cursor)
         this.targetView.x = e.x + dscl * (this.targetView.x - e.x);
         this.targetView.y = e.y + dscl * (this.targetView.y - e.y);
         this.targetView.scl *= dscl;
      }

      // Start the smooth animation loop if it's not already running
      if (!this.isAnimating) {
         this.isAnimating = true;
         requestAnimationFrame(this.animateView.bind(this));
      }
   }

   private animateView() {
      // 0.15 is the "spring" stiffness. Lower = smoother/slower, Higher = snappier
      const ease = this.scrollEase;

      // Move actual view 15% closer to target view
      this.view.x += (this.targetView.x - this.view.x) * ease;
      this.view.y += (this.targetView.y - this.view.y) * ease;
      this.view.scl += (this.targetView.scl - this.view.scl) * ease;

      // Trigger your callbacks
      this.onZoomCallback(this.view);
      this.renderImmediate();
      this.onScroll(this.view);

      // Check if we are close enough to stop animating (saves CPU)
      const dx = Math.abs(this.targetView.x - this.view.x);
      const dy = Math.abs(this.targetView.y - this.view.y);
      const ds = Math.abs(this.targetView.scl - this.view.scl);

      if (dx > 0.01 || dy > 0.01 || ds > 0.001) {
         // Still moving, request the next frame
         requestAnimationFrame(this.animateView.bind(this));
      } else {
         // Reached destination, snap to exact values and stop loop
         this.view.x = this.targetView.x;
         this.view.y = this.targetView.y;
         this.view.scl = this.targetView.scl;
         this.render(); // One final render
         this.isAnimating = false;
      }
   }
}

export default Board;
