import { SCALE_RATE } from "@/board/constants";
import type { BoardInterface, modes, Point, submodes, Tool } from "./types";
import {
   Ellipse,
   Triangle,
   Rect,
   SelectionTool,
   Shape,
   ShapeStore,
   ShapeTool,
   Parallelogram,
   PlusPath,
   PlainLine,
   Pointer,
} from "./index";

type BoardProps = {
   canvas: HTMLCanvasElement;
   width: number;
   height: number;
   onModeChange?: (m: modes, sm: submodes) => void;
};

class Board implements BoardInterface {
   currentTool: Tool;
   declare activeShapes: Set<Shape>;
   declare shapeStore: ShapeStore<Shape>;
   declare canvas2: HTMLCanvasElement;
   declare ctx2: CanvasRenderingContext2D;
   private handleKeyDown: (e: KeyboardEvent) => void;
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
      let c2 = document.getElementById(
         "board-overlay-canvas",
      ) as HTMLCanvasElement | null;
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
            board: this,
         }),
         // new Ellipse({
         //    ctx: this.ctx,
         //    top: 500,
         //    left: 500,
         //    rx: 50,
         //    ry: 50,
         //    board: this,
         // }),
         // new Triangle({
         //    board: this,
         //    ctx: this.ctx,
         //    left: 500,
         //    top: 500,
         // }),
         // new Parallelogram({
         //    board: this,
         //    ctx: this.ctx,
         //    left: 400,
         //    top: 300,
         //    width: 200,
         // }),
         // new PlusPath({
         //    board: this,
         //    ctx: this.ctx,
         //    left: 200,
         //    top: 200,
         //    width: 120,
         //    fill: "red",
         // }),
         // new PlainLine({
         //    board: this,
         //    ctx: this.ctx,
         //    left: 500,
         //    top: 300,
         //    width: 200,
         // }),
      );

      this.currentTool = new SelectionTool(this, "free");

      this.handlePointerDown = this.onmousedown.bind(this);
      this.handlePointerMove = this.onmousemove.bind(this);
      this.handlePointerUp = this.onmouseup.bind(this);
      this.handleKeyDown = this.onkeydown.bind(this);
      this.handleWheel = this.onWheel.bind(this);

      document.addEventListener("keydown", this.handleKeyDown);
      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("pointermove", this.handlePointerMove);
      this.canvas.addEventListener("pointerup", this.handlePointerUp);
      window.addEventListener("wheel", this.handleWheel, { passive: false });

      this.render();
   }

   private setTool(tool: Tool) {
      if (this.currentTool?.cleanUp) this.currentTool.cleanUp();
      this.currentTool = tool;
   }

   render() {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(
         0,
         0,
         this.canvas.width,
         this.canvas.height,
      );

      this.ctx.save();
      this.ctx.translate(this.offset.x, this.offset.y);
      this.ctx.scale(this.scale, this.scale);

      this.shapeStore.forEach((s) => {
         if (this.activeShapes.has(s)) {
            s.draw({ active: true });
         } else {
            s.draw({ active: false });
         }
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

   set setMode({
      m,
      sm,
      originUi = false,
   }: {
      m: modes;
      sm: submodes;
      originUi?: boolean;
   }) {
      if (m === "cursor") {
         this.setTool(new SelectionTool(this, sm));
      } else if (m === "shape") {
         this.setTool(new ShapeTool(this, sm));
      }

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
      document.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("wheel", this.handleWheel);

      this.shapeStore.forEach((s) => {
         s.clean();
         return false;
      });
   }

   duplicateShape(s: Shape) {
      return s.clone();
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

   private onkeydown(e: KeyboardEvent) {
      if (e.key === "Delete") {
         this.activeShapes.forEach((s) => {
            if (this.shapeStore.removeById(s.ID())) {
               this.activeShapes.delete(s);
            }
         });
         this.render();
      }
      if (e.ctrlKey) {
         switch (e.key) {
            case "d":
               e.preventDefault();
               [...this.activeShapes].forEach((s) => {
                  this.activeShapes.delete(s);
                  const ns = this.duplicateShape(s);
                  this.shapeStore.insert(ns);
                  this.activeShapes.add(ns);
               });
               this.render();
               break;
         }
      }
   }
}

export default Board;
