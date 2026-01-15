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
  active = false;

  constructor(board: Board) {
    this._board = board;
    this.clicked = { x: 0, y: 0 };

    this.handleKeyDown = this.onkeydown.bind(this);
    this.text = "";

    document.addEventListener("keydown", this.handleKeyDown);
  }

  private draw() {
    const { ctx2: context, view, canvas2: canvas } = this._board;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const texts = this.text?.split("\n") || this.text.split("\n");
    const fontSize = 25;
    const lineHeight = fontSize * 1.1; // adjust multiplier as needed
    let y = this.clicked.y;

    context.save();
    context.translate(view.x, view.y);
    context.scale(view.scl, view.scl);

    context.fillStyle = "white";

    const font = `${fontSize}px system-ui`;
    context.font = font;

    texts.forEach((t) => {
      context.fillText(t, this.clicked.x, y);
      y += lineHeight;
    });
    context.fill();

    context.restore();
  }

  onkeydown(e: KeyboardEvent) {
    if (this.active) {
      if (
        e.key != "Escape" &&
        e.key !== "Shift" &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        e.key !== "CapsLock"
      ) {
        if (e.key == "Enter") {
          this.text += "\n";
        } else if (e.key == "Backspace") {
          this.text = this.text.slice(0, this.text.length - 1);
        } else {
          this.text += e.key;
        }

        this.draw();
      } else if (e.key === "Escape") {
        const t = new Text({
          left: this.clicked.x,
          top: this.clicked.y,
          ctx: this._board.ctx,
          _board: this._board,
          text: this.text,
        });
        this._board.add(t);

        this._board.fire("shape:created", {
          e: { target: t, x: this.clicked.x, y: this.clicked.y },
        });

        this._board.ctx2.clearRect(0, 0, this._board.canvas2.width, this._board.canvas2.height);
        this._board.render();
        this._board.setMode = { m: "cursor", sm: "free" };
      }
    }
  }

  pointerDown(): void {}

  pointermove(): void {}

  pointerup(): void {}

  onClick({ p }: ToolEventData): void {
    this.clicked = p;
    this.active = !this.active;

    // const rect = this._board.canvas.getBoundingClientRect();

    // document.getElementById(this.id)?.remove();

    // const div = document.createElement("div");
    // div.setAttribute("id", this.id);
    // div.classList.add("input-container");
    // div.style.position = "absolute";
    // div.style.left = rect.left + p.x + this._board.view.x + "px";
    // div.style.top = rect.top + p.y + this._board.view.y + "px";

    // const text = document.createElement("textarea");
    // text.placeholder = "new text";

    // div.append(text);
    // document.body.append(div);

    // text.focus();

    // text.addEventListener("input", () => {
    //   this.text = text.value;
    // });

    // text.addEventListener("blur", () => {
    //   const value = text.value;
    //   const maxStr = value
    //     .split("\n")
    //     .map((a) => a)
    //     .reduce((as, bs) => (as.length > bs.length ? as : bs));

    //   const newText = new Text({
    //     _board: this._board,
    //     ctx: this._board.ctx,
    //     left: p.x,
    //     top: p.y,
    //     text: text.value || "",
    //     fontSize: 15,
    //     verticalAlign: "top",
    //     textAlign: "left",
    //     width: maxStr.length * (15 * 0.5),
    //     height: value.split("\n").length * (15 * 1.5),
    //   });
    //   if (newText.text.length > 0) {
    //     this._board.add(newText);
    //     this._board.setMode = { m: "cursor", sm: "free" };
    //     this._board.render();
    //   }
    //   div.remove();
    // });
  }

  dblClick(): void {}

  cleanUp(): void {
    document.removeEventListener("keydown", this.handleKeyDown);
    this.text = "";
  }
}

export default TextTool;
