import "../assets/index.css";

import type { Board } from "@/board/index";
import { Text } from "../../board/index";
import type { Point, ToolEventData, ToolInterface } from "../types";

class TextTool implements ToolInterface {
   private clicked: Point;
   private id = "text-create";
   private handleKeyDown: (e: KeyboardEvent) => void;
   private text: string;
   _board: Board;

   constructor(board: Board) {
      this._board = board;
      this.clicked = { x: 0, y: 0 };

      this.handleKeyDown = this.onkeydown.bind(this);
      this.text = "";

      document.addEventListener("keydown", this.handleKeyDown);
   }

   onkeydown(e: KeyboardEvent) {
      if (e.key == "Escape") {
         if (this.text.length) {
            const value = this.text;
            const maxStr = value
               .split("\n")
               .map((a) => a)
               .reduce((as, bs) => (as.length > bs.length ? as : bs));

            const newText = new Text({
               _board: this._board,
               ctx: this._board.ctx,
               left: this.clicked.x,
               top: this.clicked.y,
               text: this.text,
               fontSize: 15,
               verticalAlign: "top",
               textAlign: "left",
               width: maxStr.length * (15 * 0.5),
               height: value.split("\n").length * (15 * 1.5),
            });
            this._board.add(newText);
            this._board.render();
            this._board.setMode = { m: "cursor", sm: "free" };
         }
         document.getElementById(this.id)?.remove();
      }
   }

   pointerDown(): void {}

   pointermove(): void {}

   pointerup(): void {}

   onClick({ p }: ToolEventData): void {
      this.clicked = p;

      const rect = this._board.canvas.getBoundingClientRect();

      document.getElementById(this.id)?.remove();

      const div = document.createElement("div");
      div.setAttribute("id", this.id);
      div.classList.add("input-container");
      div.style.position = "absolute";
      div.style.left = rect.left + p.x + this._board.view.x + "px";
      div.style.top = rect.top + p.y + this._board.view.y + "px";

      const text = document.createElement("textarea");
      text.placeholder = "new text";

      div.append(text);
      document.body.append(div);

      text.focus();

      text.addEventListener("input", () => {
         this.text = text.value;
      });

      text.addEventListener("blur", () => {
         const value = text.value;
         const maxStr = value
            .split("\n")
            .map((a) => a)
            .reduce((as, bs) => (as.length > bs.length ? as : bs));

         const newText = new Text({
            _board: this._board,
            ctx: this._board.ctx,
            left: p.x,
            top: p.y,
            text: text.value || "",
            fontSize: 15,
            verticalAlign: "top",
            textAlign: "left",
            width: maxStr.length * (15 * 0.5),
            height: value.split("\n").length * (15 * 1.5),
         });
         if (newText.text.length > 0) {
            this._board.add(newText);
            this._board.setMode = { m: "cursor", sm: "free" };
            this._board.render();
         }
         div.remove();
      });
   }

   dblClick(): void {}

   cleanUp(): void {
      document.removeEventListener("keydown", this.handleKeyDown);
      this.text = "";
   }
}

export default TextTool;
