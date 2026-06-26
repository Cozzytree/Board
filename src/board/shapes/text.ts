import type { BoxInterface, Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import { calcPointWithRotation } from "../utils/utilfunc";
import Shape, { type DrawProps } from "./shape";
import { resizeRect } from "@/board/utils/resize";

class Text extends Shape {
   constructor(props: ShapeProps) {
      super(props);
      this.type = "text";
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new Text(props);
   }

   toSVG(): string {
      const attrs = this.getSvgAttributes();
      const lines = this.text.split("\n");
      const fontSize = this.fontSize || 20;
      // Base lineHeight approximation is 1.2 * fontSize
      const lineHeight = fontSize * 1.2;

      // Convert textAlign to text-anchor
      let textAnchor = "start";
      let xOffset = this.left;
      if (this.textAlign === "center") {
         textAnchor = "middle";
         xOffset = this.left + this.width / 2;
      } else if (this.textAlign === "right") {
         textAnchor = "end";
         xOffset = this.left + this.width;
      }

      let tspanElements = lines.map((line, i) => {
         // Canvas textBaseline="top" means the Y coordinate is the top of the em-box.
         // In SVG, dominant-baseline="text-before-edge" simulates this.
         return `<tspan x="${xOffset}" dy="${i === 0 ? 0 : lineHeight}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`;
      }).join("");

      const fontFamily = this.fontFamily === "1" ? "'Virgil', sans-serif" : "system-ui, sans-serif";

      return `<text x="${xOffset}" y="${this.top}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${this.fontWeight}" text-anchor="${textAnchor}" dominant-baseline="text-before-edge" ${attrs}>${tspanElements}</text>`;
   }

   draw({ ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      const currentScale = context.getTransform().a;
      if (resize) {
         context.globalAlpha = 0.5;
         const pad = this.padding;
         context.beginPath();
         context.lineWidth = this.selectionStrokeWidth;
         context.strokeStyle = this.selectionColor;
         context.rect(this.left - pad, this.top - pad, this.width + pad * 2, this.height + pad * 2);
         context.stroke();
         context.closePath();
      }

      context.save();

      const centerX = this.left + this.width * 0.5;
      const centerY = this.top + this.height * 0.5;
      context.translate(centerX, centerY);
      context.rotate(this.rotate);
      context.translate(-centerX, -centerY);
      context.beginPath();
      context.globalAlpha = this.opacity;

      super.renderText({ context, text: this.text });
      context.closePath();
      context.restore();
   }

   private _lastOldBox: BoxInterface | null = null;
   private _initialFontSize: number = 20;

   private getWrappedHeight(width: number): number {
      const context = this.ctx || document.createElement("canvas").getContext("2d");
      if (!context) return this.fontSize * 1.2 * (this.text.split("\n").length || 1);

      const font = `${this.fontWeight} ${this.italic ? "italic" : ""} ${this.fontSize}px ${this.fontFamily}`;
      context.font = font;

      const maxWidth = Math.max(0, width - this.padding * 2);
      const paragraphs = this.text.split("\n");
      const lines: string[] = [];

      const breakLongWord = (word: string): string[] => {
         const broken: string[] = [];
         let current = "";
         for (const char of word) {
            const test = current + char;
            if (context.measureText(test).width > maxWidth) {
               if (current) broken.push(current);
               current = char;
            } else {
               current += char;
            }
         }
         if (current) broken.push(current);
         return broken;
      };

      for (const paragraph of paragraphs) {
         if (paragraph.trim() === "") {
            lines.push("");
            continue;
         }
         const words = paragraph.split(" ");
         let line = "";
         for (const word of words) {
            const testLine = line ? line + " " + word : word;
            if (context.measureText(testLine).width <= maxWidth) {
               line = testLine;
            } else {
               if (line) lines.push(line);
               if (context.measureText(word).width > maxWidth) {
                  const brokenWords = breakLongWord(word);
                  for (let i = 0; i < brokenWords.length - 1; i++) {
                     lines.push(brokenWords[i]);
                  }
                  line = brokenWords[brokenWords.length - 1];
               } else {
                  line = word;
               }
            }
         }
         if (line) lines.push(line);
      }

      // Add a bit of padding offset to calculate the true needed bounding height
      return lines.length * (this.fontSize * 1.2) + this.padding * 2;
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      if (this._lastOldBox !== old) {
         this._lastOldBox = old;
         this._initialFontSize = this.fontSize;
      }

      const isDiagonal = d === "tl" || d === "tr" || d === "bl" || d === "br";
      const isVertical = d === "t" || d === "b";
      const oldWidth = old.x2 - old.x1;
      const oldHeight = old.y2 - old.y1;

      let newWidth = oldWidth;
      let newHeight = oldHeight;

      if (isDiagonal || isVertical) {
         let scale = 1;

         // Scale proportionally based on drag delta
         if (isDiagonal) {
            if (d === "br" || d === "tr") newWidth = current.x - old.x1;
            else newWidth = old.x2 - current.x;

            if (newWidth <= 0) return; // Prevent flipping past opposite side
            newWidth = Math.max(10, newWidth);
            scale = newWidth / oldWidth;
         } else {
            if (d === "b") newHeight = current.y - old.y1;
            else newHeight = old.y2 - current.y;

            if (newHeight <= 0) return; // Prevent flipping past opposite side
            newHeight = Math.max(10, newHeight);
            scale = newHeight / oldHeight;
         }

         this.fontSize = Math.max(8, this._initialFontSize * scale);
         
         // In diagonal/vertical resize, maintain exact aspect ratio
         newHeight = oldHeight * scale;
         newWidth = oldWidth * scale;

         // Adjust coords based on anchor
         let newLeft = this.left;
         let newTop = this.top;

         if (d === "br") {
            newLeft = old.x1;
            newTop = old.y1;
         } else if (d === "tr") {
            newLeft = old.x1;
            newTop = old.y2 - newHeight;
         } else if (d === "bl") {
            newLeft = old.x2 - newWidth;
            newTop = old.y1;
         } else if (d === "tl") {
            newLeft = old.x2 - newWidth;
            newTop = old.y2 - newHeight;
         } else if (d === "b") {
            newLeft = old.x1;
            newTop = old.y1;
         } else if (d === "t") {
            newLeft = old.x1;
            newTop = old.y2 - newHeight;
         }

         this.setSilent({ left: newLeft, top: newTop });
         this.setTarget({ width: newWidth, height: newHeight });
         return super.Resize(current, old, d);
      } else {
         // Horizontal
         if (d === "l" || d === "r") {
            if (d === "r") {
               newWidth = current.x - old.x1;
               if (newWidth <= 0) return; // Prevent flipping past opposite side
               this.setSilent({ left: old.x1 });
            } else {
               newWidth = old.x2 - current.x;
               if (newWidth <= 0) return; // Prevent flipping past opposite side
               this.setSilent({ left: current.x });
            }
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(oldHeight, this.getWrappedHeight(newWidth));
         }

         this.setTarget({ width: newWidth, height: newHeight });
         return super.Resize(current, old, d);
      }
   }

   IsDraggable(p: Point): boolean {
      const condition =
         p.x > this.left &&
         p.x < this.left + this.width &&
         p.y > this.top &&
         p.y < this.top + this.height;
      if (condition) {
         return true;
      }
      return false;
   }

   dragging(prev: Point, current: Point) {
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;

      this.dragInstant(
         dx,
         dy,
      )

      return super.dragging(prev, current);
   }

   IsResizable(p: Point, hitPadding: number = 0) {
      const { height, width, top, left, rotate } = this;
      const localBox = new Box({
         x1: -width / 2,
         x2: width / 2,
         y1: -height / 2,
         y2: height / 2,
      });
      const d = resizeRect(
         calcPointWithRotation({ height, width, left, point: p, rotate, top }),
         localBox,
         this.padding + hitPadding,
      );
      if (d) {
         return d.rd;
      }

      return null;
   }
}

export default Text;
