import type { BoxInterface, Point, resizeDirection, ShapeProps } from "../types";
import Box from "../utils/box";
import Shape, { type DrawProps } from "./shape";
import { resizeRect } from "@/board/utils/resize";

class Text extends Shape {
   constructor(props: ShapeProps) {
      super(props);
   }

   clone(): Shape {
      const props = super.cloneProps();
      return new Text(props);
   }

   draw({ ctx, resize = false }: DrawProps): void {
      const context = ctx || this.ctx;

      if (resize) {
         context.globalAlpha = 0.5;
         super.activeRect(context);
      }

      context.save();
      context.beginPath();

      const maxWidth = this.width;
      // const lineHeight = this.fontSize * 1.2;
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
            lines.push(""); // Preserve empty lines
            continue;
         }

         const words = paragraph.split(" ");
         let line = "";

         for (const word of words) {
            const testLine = line ? line + " " + word : word;
            const testWidth = context.measureText(testLine).width;

            if (testWidth <= maxWidth) {
               line = testLine;
            } else {
               if (line) {
                  lines.push(line);
               }

               // Now handle word — break if it's too long
               if (context.measureText(word).width > maxWidth) {
                  const brokenWords = breakLongWord(word);
                  for (let i = 0; i < brokenWords.length - 1; i++) {
                     lines.push(brokenWords[i]);
                  }
                  line = brokenWords[brokenWords.length - 1]; // Start next line with remainder
               } else {
                  line = word;
               }
            }
         }

         if (line) lines.push(line);
      }

      super.renderText({ context, text: lines.join("\n") });
      context.closePath();
      context.restore();
   }

   Resize(current: Point, old: BoxInterface, d: resizeDirection): Shape[] | void {
      switch (d) {
         case "tl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "tr":
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y2) {
               this.top = old.y2;
               this.height = current.y - old.y2;
            } else {
               this.top = current.y;
               this.height = old.y2 - current.y;
            }
            break;
         case "br":
            if (current.x - old.x1 <= this.fontSize || current.y - old.y1 <= this.fontSize) return;
            if (current.x < old.x1) {
               this.left = current.x;
               this.width = old.x1 - current.x;
            } else {
               this.left = old.x1;
               this.width = current.x - old.x1;
            }

            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
            break;
         case "bl":
            if (current.x > old.x2) {
               this.left = old.x2;
               this.width = current.x - old.x2;
            } else {
               this.left = current.x;
               this.width = old.x2 - current.x;
            }
            if (current.y > old.y1) {
               this.top = old.y1;
               this.height = current.y - old.y1;
            } else {
               this.top = current.y;
               this.height = old.y1 - current.y;
            }
      }

      return super.Resize(current, old, d);
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

      this.left += dx;
      this.top += dy;

      return super.dragging(prev, current);
   }

   IsResizable(p: Point): resizeDirection | null {
      const d = resizeRect(
         p,
         new Box({
            x1: this.left,
            y1: this.top,
            x2: this.left + this.width,
            y2: this.top + this.height,
         }),
         this.padding,
      );
      if (d) {
         return d.rd;
      }

      return null;
   }
}

export default Text;
