import type { EventData, ToolCallback, ToolEventData } from "../types";

import Tool from "./tool";
import Box from "../utils/box";
import Rect from "../shapes/rect";
import type Board from "../board";
import LineShape from "../shapes/line/line_shape";
import type Shape from "../shapes/shape";

class LineTool extends Tool {
   private indicator: {
      show: boolean;
      rect: Rect;
   };
   private newLine: LineShape | null = null;

   constructor(board: Board) {
      super(board);
      this.indicator = {
         rect: new Rect({
            _board: board,
            ctx: this._board.ctx2,
            strokeWidth: 10,
            selectionStrokeWidth: 20,
            selectionColor: "#606060",
            selectionAlpha: 0.5,
            selectionDash: [0, 0],
            rx: 2,
            ry: 2,
         }),
         show: false,
      };
   }

   cleanUp(): void {
      this.newLine = null;
   }

   pointerDown({ p }: ToolEventData): void {
      this._board.renderClickEffect(p);
      if (this._board.modes.sm === "line:straight") {
         this.newLine = new LineShape({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            linetype: "straight",
            stroke: "white",
         });
      } else if (this._board.modes.sm === "line:curve") {
         this.newLine = new LineShape({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            linetype: "curved",
            stroke: "white",
         });
      } else {
         this.newLine = new LineShape({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            linetype: "anchor",
            stroke: "white",
         });
      }
      // Set resizeIndex to last point so initial drag moves the endpoint
      if (this.newLine) {
         (this.newLine as any).resizeIndex = this.newLine.points.length - 1;
      }
   }

   pointermove({ p }: ToolEventData): void {
      if (this.newLine) {
         this.newLine.Resize(
            p,
            new Box({
               x1: this.newLine.left,
               y1: this.newLine.top,
               x2: this.newLine.left + this.newLine.width,
               y2: this.newLine.top + this.newLine.height,
            }),
            "br",
         );
         const shape = this._board.shapeStore.forEach((s) => {
            if (s.type === "line" || s.ID() === this.newLine?.ID()) return false;

            const a = s.inAnchor(p);
            if (a.isin) {
               this.indicator.show = true;
               this.indicator.rect.set({
                  left: s.left - s.padding,
                  top: s.top - s.padding,
                  width: s.width + s.padding * 2,
                  height: s.height + s.padding * 2,
               });
               return true;
            }
            return false;
         });
         if (shape) {
            this.draw(this.newLine as unknown as Shape, this.indicator.rect);
         } else {
            this.indicator.show = false;
            this.draw(this.newLine as unknown as Shape);
         }
      }
   }

   pointerup({ p }: ToolEventData, cb?: ToolCallback, ec?: (cb: EventData) => void): void {
      this.indicator.show = false;
      if (this.newLine) {
         this._board.add(this.newLine as unknown as Shape);
         this._board.render();
         this.newLine.setCoords();
         this.newLine.mouseup({ e: { point: p } });

         ec?.({ e: { target: [this.newLine as unknown as Shape], x: p.x, y: p.y } });

         this.newLine = null;
      }

      cb?.({ mode: "cursor", submode: "free" });
   }

   dblClick() { }

   onClick(): void { }
}

export default LineTool;
