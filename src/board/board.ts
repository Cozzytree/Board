import type { BoardInterface, modes, Point, submodes, ToolInterface } from "./types";
import {
   Rect,
   SelectionTool,
   Shape,
   ShapeStore,
   Pointer,
   ActiveSelection,
   ShapeTool,
   DrawTool,
   LineTool,
} from "./index";

type BoardProps = {
   canvas: HTMLCanvasElement;
   width: number;
   height: number;
   onModeChange?: (m: modes, sm: submodes) => void;
};

class Board implements BoardInterface {
   currentTool: ToolInterface;
   _lastMousePosition: Point = { x: 0, y: 0 };
   declare activeShapes: Set<Shape>;
   declare shapeStore: ShapeStore<Shape>;
   declare canvas2: HTMLCanvasElement;
   declare ctx2: CanvasRenderingContext2D;
   private handlePointerDown: (e: PointerEvent) => void;
   private handlePointerMove: (e: PointerEvent) => void;
   private handlePointerUp: (e: PointerEvent) => void;
   private handleWheel: (e: WheelEvent) => void;
   declare onModeChange?: (m: modes, sm: submodes) => void;

   scale = 1;
   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   modes: { m: modes; sm: submodes };
   offset = new Pointer({ x: 0, y: 0 });

   constructor({ canvas, width, height, onModeChange }: BoardProps) {
      this.canvas = canvas;
      this.canvas.width = width;
      this.canvas.height = height;
      this.onModeChange = onModeChange;

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
         document.body.appendChild(c2);
      }

      this.canvas2 = c2;

      // Ensure proper z-index layering
      this.canvas.style.position = "absolute";
      this.canvas.style.left = "0px";
      this.canvas.style.top = "0px";
      this.canvas.style.zIndex = "10"; // Main canvas is on top
      this.canvas.style.backgroundColor = "transparent"; // Transparent background

      c2.style.zIndex = "5"; // Overlay canvas underneath

      // Get proper contexts
      const ctx = this.canvas.getContext("2d");
      const ctx2 = c2.getContext("2d");

      if (!ctx || !ctx2) throw new Error("canvas context not supported");

      this.ctx = ctx;
      this.ctx2 = ctx2;

      this.modes = { m: "cursor", sm: "free" };
      this.shapeStore = new ShapeStore();
      this.activeShapes = new Set();

      this.shapeStore.insert(
         new Rect({
            ctx: this.ctx,
            top: 30,
            left: 10,
            width: 100,
            height: 100,
            fill: "#FF6050",
            rx: 10,
            ry: 10,
            _board: this,
         }),
      );

      this.currentTool = new SelectionTool(this, "free");

      this.handlePointerDown = this.onmousedown.bind(this);
      this.handlePointerMove = this.onmousemove.bind(this);
      this.handlePointerUp = this.onmouseup.bind(this);
      this.handleWheel = this.onWheel.bind(this);

      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("pointermove", this.handlePointerMove);
      this.canvas.addEventListener("pointerup", this.handlePointerUp);
      window.addEventListener("wheel", this.handleWheel, { passive: false });

      this.render();
   }

   set setCanvasWidth(width: number) {
      this.canvas.width = width;
      this.canvas2.width = width;
   }

   set setCanvasHeight(height: number) {
      this.canvas.height = height;
      this.canvas2.height = height;
   }

   getActiveShapes(): Shape[] {
      const s: Shape[] = [];
      const iter = this.activeShapes.values(); // Get Iterator<Shape>
      let entry = iter.next();
      while (!entry.done) {
         s.push(entry.value);
         entry = iter.next();
      }
      return s;
   }

   discardActiveShapes() {
      // this.shapeStore.setLastInserted = null;
      this.activeShapes.clear();
   }

   setActiveShape(...shapes: Shape[]) {
      if (shapes.length == 1) {
         this.activeShapes.add(shapes[0]);
      } else {
         //
      }
   }

   removeShape(...shapes: Shape[]): number {
      let count = 0;
      this.discardActiveShapes();
      shapes.forEach((s) => {
         if (s instanceof ActiveSelection && s.type === "selection") {
            s.shapes.forEach((as) => {
               if (this.shapeStore.removeById(as.s.ID())) count++;
            });
         }
         if (this.shapeStore.removeById(s.ID())) count++;
      });

      this.render();
      return count;
   }

   add(...shapes: Shape[]) {
      const lastInserted = this.shapeStore.getLastInsertedShape();
      if (lastInserted?.type === "selection") {
         this.shapeStore.removeById(lastInserted.ID());
      }

      this.shapeStore.insert(...shapes);
      this.discardActiveShapes();
      this.setActiveShape(...shapes);
   }

   private setTool(tool: ToolInterface) {
      if (this.currentTool?.cleanUp) this.currentTool.cleanUp();
      this.currentTool = tool;
   }

   render() {
      const { ctx, canvas, offset, scale, shapeStore, activeShapes } = this;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Compute world-space viewport
      const viewLeft = -offset.x / scale;
      const viewTop = -offset.y / scale;
      const viewRight = viewLeft + canvas.width / scale;
      const viewBottom = viewTop + canvas.height / scale;

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      shapeStore.forEach((s) => {
         const { x, y, width, height } = s.getBounds();

         // Check AABB intersection
         if (x + width < viewLeft || x > viewRight || y + height < viewTop || y > viewBottom) {
            return false; // entirely off-screen, skip draw
         }

         s.draw({ active: activeShapes.has(s) });
         return false;
      });
      this.ctx.restore();
   }

   private onmousedown(e: PointerEvent) {
      this.currentTool.pointerDown(e);
   }

   private onmousemove(e: PointerEvent) {
      this.currentTool.pointermove(e);
   }

   private onmouseup(e: PointerEvent) {
      this.currentTool.pointerup(e, (v) => {
         this.setMode = { m: v.mode, sm: v.submode };
      });
   }

   set setMode({ m, sm, originUi = false }: { m: modes; sm: submodes; originUi?: boolean }) {
      if (m === "cursor") {
         this.setTool(new SelectionTool(this, sm));
      } else if (m === "shape") {
         this.setTool(new ShapeTool(this, sm));
      } else if (m === "draw") {
         this.setTool(new DrawTool(this));
      } else if (m === "line") {
         this.setTool(new LineTool(this));
      }

      this.modes = { m, sm };
      if (!originUi) {
         this.onModeChange?.(m, sm);
      }
   }

   getTransFormedCoords(e: MouseEvent | PointerEvent) {
      // 1. Grab the canvas's screen-space position.
      const rect = this.canvas.getBoundingClientRect();

      // 2. Adjust for the canvas's position on the screen.
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // 3. Remove any translation offset applied in your drawing or transform logic.
      const translatedX = rawX - this.offset.x;
      const translatedY = rawY - this.offset.y;

      // 4. Divide by the scale factor to map back to canvas logical pixels.
      const x = translatedX / this.scale;
      const y = translatedY / this.scale;

      return { x, y };
   }

   clean() {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      window.removeEventListener("wheel", this.handleWheel);
      if (this.currentTool) {
         this.currentTool.cleanUp();
      }

      this.shapeStore.forEach((s) => {
         s.clean();
         return false;
      });
   }

   private onWheel(e: WheelEvent) {
      const box = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - box.left;
      const mouseY = e.clientY - box.top;
      if (!e.ctrlKey) {
         if (e.deltaY > 0) {
            this.offset.y -= 80;
         } else {
            this.offset.y += 80;
         }
      } else {
         e.preventDefault();

         const zoomFactor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
         const newScale = this.scale * zoomFactor;

         // Prevent zooming too far in or out
         if (newScale < 0.4 || newScale > 10) return;

         // Get world coordinates under the mouse before scaling
         const worldX = (mouseX - this.offset.x) / this.scale;
         const worldY = (mouseY - this.offset.y) / this.scale;

         // Apply new scale
         this.scale = newScale;

         // Update offset to keep the mouse position stable
         this.offset.x = mouseX - worldX * this.scale;
         this.offset.y = mouseY - worldY * this.scale;
      }
      this.render();
   }
}

export default Board;
