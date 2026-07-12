import Box from "../utils/box";
import Group from "../shapes/group";
import Shape from "../shapes/shape.ts"
import type Board from "../board";
import type { EventData, ToolCallback, ToolEventData, ToolInterface } from "../types";

class FrameTool implements ToolInterface {
   _board: Board
   private _tempGroup: Group | null;
   private _oldBox: Box | null;

   constructor(board: Board) {
      this._board = board;
      this._tempGroup = null;
      this._oldBox = null;
   }

   onClick(e: ToolEventData): void {

   }

   dblClick(e: ToolEventData): void {

   }

   pointerDown(e: ToolEventData, callback: (e: EventData) => void): void {
      this._board.renderClickEffect(e.p);
      this._tempGroup = new Group({
         left: e.p.x,
         top: e.p.y,
         width: 0,
         height: 0,
         shapes: [],
         _board: this._board,
         ctx: this._board.ctx,
         strokeWidth: 2,
         stroke: this._board.foreground,
      });

      this._board.add(this._tempGroup);

      this._oldBox = new Box({
         x1: this._tempGroup.left,
         y1: this._tempGroup.top,
         x2: this._tempGroup.left,
         y2: this._tempGroup.top,
      });

      this._board.fire("shape:created", { e: { target: [this._tempGroup], x: e.p.x, y: e.p.y } });
      this._tempGroup.mousedown({ e: { point: e.p }});
   }

   pointerup(e: ToolEventData, cb?: ToolCallback, ec?: (e: EventData) => void): void {
      this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);

      if (this._tempGroup !== null) {
         const group = this._tempGroup;
         
         group.setCoords();
         group.mouseup({ e: { point: e.p } });
         
         ec?.({ e: { target: [group], x: e.p.x, y: e.p.y } });
         this._oldBox = null;
         cb?.({ mode: "cursor", submode: "free" });

         this._board.render();
         
         if (this._tempGroup === group) {
            this._tempGroup = null;
         }
      }
   }

   cleanUp() {
      this._tempGroup = null;
   }

   pointermove(e: ToolEventData, callback: (e: EventData) => void): void {
      if (this._tempGroup && this._oldBox) {
         this._tempGroup.Resize({
            x: e.p.x,
            y: e.p.y,
         }, this._oldBox, "br");
         this.draw(this._tempGroup);
      }
   }

  private draw(...shapes: Shape[]) {
      const ctx = this._board.ctx2;

      this._board.resetContextTransform(ctx);
      ctx.clearRect(0, 0, this._board.cssWidth, this._board.cssHeight);
      ctx.save();

      // ctx.translate(this._board.offset.x, this._board.offset.y);
      ctx.translate(this._board.view.x, this._board.view.y);
      // ctx.scale(this._board.scale, this._board.scale);
      ctx.scale(this._board.view.scl, this._board.view.scl);

      this._board.canvas2.style.zIndex = "100";
      shapes.forEach((s) => {
         s.draw({
            addStyles: false,
            ctx: ctx,
            resize: true,
         });
      });
      ctx.restore();
   }
}

export default FrameTool;
