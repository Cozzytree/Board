import "../assets/index.css";

import type { Board } from "@/board/index";
import { Text } from "../../board/index";
import type { ToolEventData, ToolInterface } from "../types";

class TextTool implements ToolInterface {
  private id = "text-create";
  _board: Board;
  private currentTextarea: HTMLTextAreaElement | null = null;
  private currentPosition: { x: number; y: number } | null = null;

  constructor(board: Board) {
    this._board = board;
  }

  pointerDown(): void { }

  pointermove(): void { }

  pointerup(): void { }

  onClick({ p }: ToolEventData): void {
    // If there's already an active textarea, finalize it first
    if (this.currentTextarea && this.currentPosition) {
      this.finalizeText(this.currentTextarea, this.currentPosition);
    }

    // Store current position
    this.currentPosition = { x: p.x, y: p.y };

    const rect = this._board.canvas.getBoundingClientRect();

    // Create container div
    const div = document.createElement("div");
    div.setAttribute("id", this.id);
    div.classList.add("input-container");
    div.style.position = "absolute";
    div.style.left = rect.left + p.x * this._board.view.scl + this._board.view.x + "px";
    div.style.top = rect.top + p.y * this._board.view.scl + this._board.view.y + "px";
    div.style.zIndex = "1000";

    // Create textarea
    const textarea = document.createElement("textarea");
    textarea.placeholder = "Enter text...";
    textarea.style.minWidth = "200px";
    textarea.style.minHeight = "50px";
    textarea.style.fontSize = "16px"; // Prevents zoom on iOS
    textarea.style.padding = "8px";
    textarea.style.outline = "none";
    textarea.style.resize = "both";
    textarea.style.fontFamily = "system-ui";
    textarea.style.color = "white";

    div.append(textarea);
    document.body.append(div);

    // Store reference to current textarea
    this.currentTextarea = textarea;

    // Focus the textarea (this will trigger mobile keyboard)
    setTimeout(() => textarea.focus(), 0);

    // Flag to prevent blur after Escape
    let escapedPressed = false;

    // Handle Escape key to cancel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        escapedPressed = true;
        div.remove();
        this._board.setMode = { m: "cursor", sm: "free" };
      }
    };
    textarea.addEventListener("keydown", handleKeyDown);

    // Handle blur (when user clicks outside or finishes)
    const handleBlur = () => {
      // Don't process blur if Escape was pressed
      if (escapedPressed) {
        return;
      }

      if (this.currentPosition) {
        this.finalizeText(textarea, this.currentPosition);
      }
    };
    textarea.addEventListener("blur", handleBlur);
  }

  private finalizeText(textarea: HTMLTextAreaElement, position: { x: number; y: number }): void {
    const value = textarea.value.trim();

    if (value.length > 0) {
      const lines = value.split("\n");
      const maxStr = lines.reduce((as, bs) => (as.length > bs.length ? as : bs), "");
      const fontSize = 25;

      const newText = new Text({
        _board: this._board,
        ctx: this._board.ctx,
        left: position.x,
        top: position.y,
        text: value,
        fontSize: fontSize,
        verticalAlign: "top",
        textAlign: "left",
        width: Math.max(maxStr.length * (fontSize * 0.6), 100),
        height: lines.length * (fontSize * 1.2),
      });

      this._board.add(newText);
      this._board.fire("shape:created", { e: { target: [newText], x: position.x, y: position.y } });
      this._board.render();
    }

    // Clean up
    const div = document.getElementById(this.id);
    if (div) {
      div.remove();
    }
    this.currentTextarea = null;
    this.currentPosition = null;
    this._board.setMode = { m: "cursor", sm: "free" };
  }

  dblClick(): void { }

  cleanUp(): void {
    // Finalize any active text input before cleanup
    if (this.currentTextarea && this.currentPosition) {
      this.finalizeText(this.currentTextarea, this.currentPosition);
    }

    // Clean up any existing text input
    document.getElementById(this.id)?.remove();
    this.currentTextarea = null;
    this.currentPosition = null;
  }
}

export default TextTool;
