import type { ToolCallback, ToolEventData } from "../types";

import Tool from "./tool";
import { AnchorLine, Box, LineCurve, PlainLine, Rect, type Board, type Line } from "@/board/index";

class LineTool extends Tool {
   private indicator: {
      show: boolean;
      rect: Rect;
   };
   private newLine: Line | null = null;

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
      if (this._board.modes.sm === "line:straight") {
         this.newLine = new PlainLine({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            lineType: "straight",
            fill: "white",
            stroke: "white",
         });
      } else if (this._board.modes.sm === "line:curve") {
         this.newLine = new LineCurve({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 0, y: 0 },
               { x: 0, y: 0 },
            ],
            left: p.x,
            top: p.y,
            lineType: "curve",
            fill: "white",
         });
      } else {
         this.newLine = new AnchorLine({
            _board: this._board,
            ctx: this._board.ctx,
            points: [
               { x: 0, y: 0 },
               { x: 1.5, y: 0 },
               { x: 1.5, y: 3 },
               { x: 3, y: 3 },
            ],
            left: p.x,
            top: p.y,
         });
      }

      this.newLine.mousedown({ e: { point: p } });
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
            this.draw(this.newLine, this.indicator.rect);
         } else {
            this.indicator.show = false;
            this.draw(this.newLine);
         }
      }
   }

   pointerup(e: ToolEventData, cb?: ToolCallback): void {
      this.indicator.show = false;
      if (this.newLine) {
         this._board.add(this.newLine);
         this._board.render();
         this.newLine.setCoords();
         this.newLine.mouseup({ e: { point: e.p } });
         this.newLine = null;
      }

      cb?.({ mode: "cursor", submode: "free" });
   }

   dblClick() {}

   onClick(): void {}
}

export default LineTool;
