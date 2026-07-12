import "../assets/index.css";

import type Board from "../board";
import Text from "../shapes/text";
import type { ToolEventData, ToolInterface } from "../types";

class TextTool implements ToolInterface {
   private id = "text-create";
   _board: Board;
   private currentTextarea: HTMLTextAreaElement | null = null;
   private currentPosition: { x: number; y: number } | null = null;
   private outsidePointerHandler: ((e: PointerEvent) => void) | null = null;
   private liveTextShape: Text | null = null;
   private readonly baseFontSize = 25;
   private readonly minWidth = 120;
   private readonly minHeight = 36;
   private readonly paddingX = 8;
   private readonly paddingY = 6;

   constructor(board: Board) {
      this._board = board;
   }

   pointerDown({ p }: ToolEventData): void {
      this._board.renderClickEffect(p);
   }

   pointermove(): void { }

   pointerup(): void { }

   onClick({ p }: ToolEventData): void {
      if (this.currentTextarea && this.currentPosition) {
         this.commitEditor();
      }

      this.currentPosition = { x: p.x, y: p.y };
      const rect = this._board.canvas.getBoundingClientRect();

      const div = document.createElement("div");
      div.setAttribute("id", this.id);
      div.style.position = "absolute";
      div.style.left = rect.left + p.x * this._board.view.scl + this._board.view.x + "px";
      div.style.top = rect.top + p.y * this._board.view.scl + this._board.view.y + "px";
      div.style.zIndex = "1000";

      const textarea = document.createElement("textarea");
      const scale = this._board.view.scl;
      const editorFontSize = (this._board.defaultShapeProps.fontSize || this.baseFontSize) * scale;

      textarea.placeholder = ""; 
      textarea.spellcheck = true;
      textarea.autocomplete = "off";
      textarea.setAttribute("autocapitalize", "sentences");
      textarea.setAttribute("inputmode", "text");
      
      // Styling to exactly match canvas Text shape
      textarea.style.margin = "0px";
      textarea.style.padding = `${8 * scale}px`; // Match Shape padding (8px)
      textarea.style.border = "none";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.overflow = "hidden";
      textarea.style.background = "transparent";
      textarea.style.color = this._board.defaultShapeProps.fill || this._board.foreground;
      textarea.style.fontFamily = this._board.defaultShapeProps.fontFamily || "system-ui, sans-serif";
      textarea.style.fontWeight = this._board.defaultShapeProps.fontWeight || "500";
      textarea.style.fontSize = `${editorFontSize}px`;
      textarea.style.lineHeight = `${editorFontSize * 1.2}px`;
      textarea.style.whiteSpace = "pre"; // Don't wrap automatically unless explicitly breaking line
      textarea.style.boxSizing = "border-box";
      textarea.style.caretColor = this._board.foreground;

      div.append(textarea);
      document.body.append(div);
      this.currentTextarea = textarea;

      // Auto-size function
      const autoSize = () => {
         const measureCanvas = document.createElement("canvas");
         const measureCtx = measureCanvas.getContext("2d");
         if (!measureCtx) return;
         measureCtx.font = `${editorFontSize}px system-ui, sans-serif`;

         const lines = (textarea.value || "").split("\n");
         const longest = lines.reduce((max, line) => {
            const candidate = line.length ? line : " ";
            return Math.max(max, measureCtx.measureText(candidate).width);
         }, 0);

         const paddingX = 8 * scale;
         const paddingY = 8 * scale; 
         
         const width = Math.max(this.minWidth * scale, Math.ceil(longest + paddingX * 2) + 10); // +10 for caret buffer
         const height = Math.ceil(lines.length * (editorFontSize * 1.2) + paddingY * 2);

         textarea.style.width = `${width}px`;
         textarea.style.height = `${height}px`;
      };

      autoSize();

      requestAnimationFrame(() => {
         textarea.focus();
      });

      textarea.addEventListener("input", autoSize);

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
      
      textarea.addEventListener("blur", () => {
         this.commitEditor();
      });

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

   private commitEditor(): void {
      if (!this.currentTextarea || !this.currentPosition) return;
      
      const rawValue = this.currentTextarea.value.replace(/\r/g, "");
      if (rawValue.trim().length > 0) {
         const measureCanvas = document.createElement("canvas");
         const measureCtx = measureCanvas.getContext("2d");
         
         let width = this.minWidth;
         let height = this.minHeight;
         
         if (measureCtx) {
            measureCtx.font = `${this.baseFontSize}px system-ui, sans-serif`;
            const lines = rawValue.split("\n");
            const longest = lines.reduce((max, line) => {
               const candidate = line.length ? line : " ";
               return Math.max(max, measureCtx.measureText(candidate).width);
            }, 0);
            
            width = Math.max(this.minWidth, Math.ceil(longest + 8 * 2));
            height = Math.max(this.minHeight, lines.length * (this.baseFontSize * 1.2) + 8 * 2);
         }

         const newText = new Text({
            _board: this._board,
            ctx: this._board.ctx,
            left: this.currentPosition.x,
            top: this.currentPosition.y,
            text: rawValue,
            fontSize: this.baseFontSize,
            verticalAlign: "top",
            textAlign: "left",
            width,
            height,
            fontWeight: 200,
            stroke: this._board.foreground,
            fill: this._board.foreground
         });

         this._board.add(newText);
         this._board.fire("shape:created", { e: { target: [newText], x: this.currentPosition.x, y: this.currentPosition.y } });
         this._board.render();
      }

      this.cancelEditor();
   }

   private cancelEditor(): void {
      const div = document.getElementById(this.id);
      div?.remove();
      this.detachOutsidePointerHandler();
      this.currentTextarea = null;
      this.currentPosition = null;
      this.liveTextShape = null;
      this._board.setMode = { m: "cursor", sm: "free" };
   }

   private detachOutsidePointerHandler(): void {
      if (this.outsidePointerHandler) {
         document.removeEventListener("pointerdown", this.outsidePointerHandler, true);
         this.outsidePointerHandler = null;
      }
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
