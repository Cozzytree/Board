import "../assets/index.css";

import type { Board } from "@/board/index";
import { Text } from "../../board/index";
import type { ToolEventData, ToolInterface } from "../types";

class TextTool implements ToolInterface {
  private id = "text-create";
  _board: Board;
  private currentTextarea: HTMLTextAreaElement | null = null;
  private currentPosition: { x: number; y: number } | null = null;
  private outsidePointerHandler: ((e: PointerEvent) => void) | null = null;
  private readonly baseFontSize = 25;
  private readonly minWidth = 120;
  private readonly minHeight = 36;
  private readonly paddingX = 8;
  private readonly paddingY = 6;

  constructor(board: Board) {
    this._board = board;
  }

  pointerDown(): void { }

  pointermove(): void { }

  pointerup(): void { }

  onClick({ p }: ToolEventData): void {
    // If there's already an active textarea, finalize it first
    if (this.currentTextarea && this.currentPosition) {
      this.commitEditor();
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
    div.style.padding = "0";

    // Create textarea
    const textarea = document.createElement("textarea");
    const editorFontSize = this.baseFontSize * this._board.view.scl;

    textarea.placeholder = "Type...";
    textarea.spellcheck = true;
    textarea.autocomplete = "off";
    textarea.autocorrect = "on";
    textarea.setAttribute("autocapitalize", "sentences");
    textarea.setAttribute("inputmode", "text");
    textarea.style.minWidth = `${this.minWidth * this._board.view.scl}px`;
    textarea.style.minHeight = `${this.minHeight * this._board.view.scl}px`;
    textarea.style.fontSize = `${editorFontSize}px`; // Prevents iOS zoom and matches canvas scale
    textarea.style.lineHeight = `${editorFontSize * 1.2}px`;
    textarea.style.padding = `${this.paddingY * this._board.view.scl}px ${this.paddingX * this._board.view.scl}px`;
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.touchAction = "manipulation";
    textarea.style.fontFamily = "system-ui";
    textarea.style.color = "white";
    textarea.style.background = "transparent";
    textarea.style.border = "1px solid rgba(255,255,255,0.2)";
    textarea.style.borderRadius = `${6 * this._board.view.scl}px`;
    textarea.style.caretColor = "white";

    div.append(textarea);
    document.body.append(div);

    // Store reference to current textarea
    this.currentTextarea = textarea;

    // Focus the textarea (this triggers mobile keyboard)
    requestAnimationFrame(() => {
      textarea.focus();
      this.autoSizeTextarea(textarea);
    });

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      if (e.key === "Escape") {
        e.preventDefault();
        this.commitEditor();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        this.commitEditor();
      }
    };
    textarea.addEventListener("keydown", handleKeyDown);
    textarea.addEventListener("input", () => {
      this.autoSizeTextarea(textarea);
    });

    // Handle blur (when user clicks outside or finishes)
    const handleBlur = () => {
      this.commitEditor();
    };
    textarea.addEventListener("blur", handleBlur);

    // Tap/click outside should commit text. Use pointerdown so touch works reliably.
    this.outsidePointerHandler = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || div.contains(target)) return;
      this.commitEditor();
    };

    setTimeout(() => {
      if (this.outsidePointerHandler) {
        document.addEventListener("pointerdown", this.outsidePointerHandler, true);
      }
    }, 0);
  }

  private autoSizeTextarea(textarea: HTMLTextAreaElement): void {
    const scale = this._board.view.scl || 1;
    const fontSize = this.baseFontSize * scale;
    const lineHeight = fontSize * 1.2;
    const widthPadding = this.paddingX * 2 * scale;
    const heightPadding = this.paddingY * 2 * scale;

    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (!measureCtx) return;
    measureCtx.font = `${fontSize}px system-ui`;

    const lines = (textarea.value || "").split("\n");
    const longest = lines.reduce((max, line) => {
      const candidate = line.length ? line : " ";
      return Math.max(max, measureCtx.measureText(candidate).width);
    }, 0);

    const width = Math.max(this.minWidth * scale, Math.ceil(longest + widthPadding));
    const lineCount = Math.max(lines.length, 1);
    const height = Math.max(this.minHeight * scale, Math.ceil(lineCount * lineHeight + heightPadding));

    textarea.style.width = `${width}px`;
    textarea.style.height = `${height}px`;
  }

  private commitEditor(): void {
    if (!this.currentTextarea || !this.currentPosition) return;
    this.finalizeText(this.currentTextarea, this.currentPosition);
  }

  private cancelEditor(): void {
    const div = document.getElementById(this.id);
    div?.remove();
    this.detachOutsidePointerHandler();
    this.currentTextarea = null;
    this.currentPosition = null;
    this._board.setMode = { m: "cursor", sm: "free" };
  }

  private detachOutsidePointerHandler(): void {
    if (this.outsidePointerHandler) {
      document.removeEventListener("pointerdown", this.outsidePointerHandler, true);
      this.outsidePointerHandler = null;
    }
  }

  private finalizeText(textarea: HTMLTextAreaElement, position: { x: number; y: number }): void {
    const rawValue = textarea.value.replace(/\r/g, "");
    const value = rawValue;

    if (value.trim().length > 0) {
      const lines = value.split("\n");
      const widthPx = parseFloat(textarea.style.width || "0");
      const heightPx = parseFloat(textarea.style.height || "0");
      const scale = this._board.view.scl || 1;
      const width = Math.max(this.minWidth, widthPx / scale);
      const height = Math.max(lines.length * (this.baseFontSize * 1.2), heightPx / scale);

      const newText = new Text({
        _board: this._board,
        ctx: this._board.ctx,
        left: position.x,
        top: position.y,
        text: value,
        fontSize: this.baseFontSize,
        verticalAlign: "top",
        textAlign: "left",
        width,
        height,
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
    this.detachOutsidePointerHandler();
    this.currentTextarea = null;
    this.currentPosition = null;
    this._board.setMode = { m: "cursor", sm: "free" };
  }

  dblClick(): void { }

  cleanUp(): void {
    // Finalize any active text input before cleanup
    if (this.currentTextarea && this.currentPosition) {
      this.commitEditor();
    }

    // Clean up any existing text input
    document.getElementById(this.id)?.remove();
    this.detachOutsidePointerHandler();
    this.currentTextarea = null;
    this.currentPosition = null;
  }
}

export default TextTool;
