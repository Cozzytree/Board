import type { BoardInterface, modes, submodes, Tool } from "./types";
import {
   Ellipse,
   Rect,
   SelectionTool,
   Shape,
   ShapeStore,
   ShapeTool,
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
   private handlePointerDown: (e: PointerEvent) => void;
   private handlePointerMove: (e: PointerEvent) => void;
   private handlePointerUp: (e: PointerEvent) => void;
   declare onModeChange?: (m: modes, sm: submodes) => void;

   canvas: HTMLCanvasElement;
   ctx: CanvasRenderingContext2D;
   modes: { m: modes; sm: submodes };
   offset: [number, number] = [0, 0];

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
         }),
         new Ellipse({
            ctx: this.ctx,
            top: 500,
            left: 500,
            rx: 50,
            ry: 50,
         }),
      );

      this.currentTool = new SelectionTool(this, "free");

      this.handlePointerDown = this.onmousedown.bind(this);
      this.handlePointerMove = this.onmousemove.bind(this);
      this.handlePointerUp = this.onmouseup.bind(this);

      this.canvas.addEventListener("pointerdown", this.handlePointerDown);
      this.canvas.addEventListener("pointermove", this.handlePointerMove);
      this.canvas.addEventListener("pointerup", this.handlePointerUp);

      this.render();
   }

   private setTool(tool: Tool) {
      if (this.currentTool?.cleanUp) this.currentTool.cleanUp();
      this.currentTool = tool;
   }

   render() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();
      this.ctx.translate(this.offset[0], this.offset[1]);

      this.ctx.scale(1, 1);
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
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.offset[0]) / 1;
      const y = (e.clientY - rect.top - this.offset[1]) / 1;
      return { x, y };
   }

   clean() {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
   }
}

export default Board;
