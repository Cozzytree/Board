import type Board from "../board";
import type { EventData, ToolCallback, ToolEventData, ToolInterface } from "../types";
import ImageShape from "../shapes/image_shape";

class ImageTool implements ToolInterface {
  private _board: Board;
  private _onUpload?: (file: File) => Promise<string>;
  private _pendingClick: boolean = false;

  constructor(board: Board, onUpload?: (file: File) => Promise<string>) {
    this._board = board;
    this._onUpload = onUpload;
  }

  cleanUp(): void {
    // Remove any lingering file inputs
    document.getElementById("board-image-upload")?.remove();
  }

  pointerDown({ p }: ToolEventData): void {
    if (this._pendingClick) return;
    this._pendingClick = true;

    // Create a hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.id = "board-image-upload";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        this._pendingClick = false;
        input.remove();
        return;
      }

      let imageSrc: string;

      // Try onUpload callback first
      if (this._onUpload) {
        try {
          imageSrc = await this._onUpload(file);
        } catch (err) {
          console.error("onUpload failed, falling back to data URL", err);
          imageSrc = await this._readAsDataUrl(file);
        }
      } else {
        imageSrc = await this._readAsDataUrl(file);
      }

      // Create shape at click position
      const shape = new ImageShape({
        _board: this._board,
        ctx: this._board.ctx,
        left: p.x,
        top: p.y,
        width: 4, // Placeholder, will be set on image load
        height: 4,
        imageSrc,
      });

      this._board.add(shape);
      this._board.render();

      // Switch back to cursor mode
      this._board.setMode = { m: "cursor", sm: "free" };

      this._pendingClick = false;
      input.remove();
    };

    // Handle cancel (user closes file dialog without selecting)
    input.addEventListener("cancel", () => {
      this._pendingClick = false;
      input.remove();
    });

    // Also handle blur as fallback for cancel detection
    const handleBlur = () => {
      setTimeout(() => {
        if (this._pendingClick && !input.files?.length) {
          this._pendingClick = false;
          input.remove();
        }
        window.removeEventListener("focus", handleBlur);
      }, 300);
    };
    window.addEventListener("focus", handleBlur);

    input.click();
  }

  private _readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  pointermove(): void { }

  pointerup(_: ToolEventData, cb?: ToolCallback): void {
    // No-op — image creation happens in pointerDown's async callback
  }

  dblClick(): void { }

  onClick(): void { }
}

export default ImageTool;
