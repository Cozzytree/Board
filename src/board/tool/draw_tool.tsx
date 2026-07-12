import SimplePath from "../shapes/paths/simple_path";
import type Board from "../board";
import Tool from "./tool";
import type { ToolEventData } from "../types";

class DrawTool extends Tool {
   private shape: SimplePath | null = null;
   private isDrawingScheduled: boolean = false;
   private strokeWidth: number = 4;

   constructor(board: Board) {
      super(board);
      this._board = board;
   }

   getConf(key: string) {
      // @ts-ignore
      return this[key];
   }

   setConf(key: string, value: any): void {
      // @ts-ignore
      if (this[key]) {
         // @ts-ignore
         this[key] = value;
      }
   }

   pointerDown({ p }: ToolEventData): void {
      this._board.renderClickEffect(p);
      this.shape = new SimplePath({
         left: p.x,
         top: p.y,
         _board: this._board,
         ctx: this._board.ctx,
         roughness: 0,
         strokeWidth: this.strokeWidth
      });
      this.isDrawingScheduled = false;
   }

   pointermove({ p }: ToolEventData): void {
      if (!this.shape) return;

      const points = this.shape.points;
      points.push({ x: p.x - this.shape.left, y: p.y - this.shape.top });
      this.shape.set("points", points);

      if (!this.isDrawingScheduled) {
         this.isDrawingScheduled = true;
         requestAnimationFrame(() => {
            if (this.shape) {
               this.draw(this.shape);
            }
            this.isDrawingScheduled = false;
         });
      }
   }

   cleanUp(): void { }

   pointerup(_: ToolEventData): void {
      if (!this.shape) {
         return;
      }

      this._board.add(this.shape);
      this._board.discardActiveShapes();
      this.shape.setCoords();
      this._board.render();

      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
      this.shape = null;
   }

   dblClick() { }

   onClick(): void { }
}

export default DrawTool;
