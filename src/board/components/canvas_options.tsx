import { DownloadIcon, MoonIcon, SunIcon, SaveIcon, TrashIcon, FolderOpenIcon, ImageIcon, UploadIcon, PlusIcon } from "lucide-react";
import { useBoard } from "../board-context";
import { Button } from "@/components/ui/button";
import type { Theme } from "../board_provider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const BACKGROUNDS = {
   light: ["#ffffff", "#f8f9fa", "#f1f3f5", "#fff5f5", "#fff0f6", "#f8f0fc", "#f3f0ff", "#edf2ff", "#e6fcf5", "#ebfbee", "#f4fce3", "#fff9db", "#fff4e6"],
   dark: ["#121212", "#181818", "#1e1e1e", "#252526", "#2d2d30", "#3e3e42", "#2b2b2b", "#1f1f1f", "#141414", "#0a0a0a"]
};

export default function CanvasOptions() {
   const { setTheme, theme, canvas, background, setBackground } = useBoard();
   const [filename, setFilename] = useState("untitled-board");
   const [isFileOpDialogOpen, setIsFileOpDialogOpen] = useState(false);
   const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
   const [isTransparentBg, setIsTransparentBg] = useState(false);
   const [previewUrl, setPreviewUrl] = useState("");
   const [exportFilename, setExportFilename] = useState("untitled-image");
   
   const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

   useEffect(() => {
      if (theme === "system") {
         const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
         setResolvedTheme(isDark ? "dark" : "light");
      } else {
         setResolvedTheme(theme as "light" | "dark");
      }
   }, [theme]);

   const generatePreview = (transparent: boolean) => {
      if (!canvas) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let shapeCount = 0;
      canvas.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            const { x, y, width, height } = s.getBounds();
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
            shapeCount++;
         }
         return false;
      });

      if (shapeCount === 0) return;

      const padding = 20;
      // Safeguard against extreme values if the canvas is practically empty
      const width = Math.max(1, maxX - minX + padding * 2);
      const height = Math.max(1, maxY - minY + padding * 2);

      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      if (!transparent) {
         ctx.fillStyle = canvas.background;
         ctx.fillRect(0, 0, width, height);
      }

      ctx.translate(-minX + padding, -minY + padding);

      canvas.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            s.draw({ ctx, addStyles: true });
         }
         return false;
      });

      setPreviewUrl(c.toDataURL("image/png"));
   };

   const handleOpenExportDialog = () => {
      setExportFilename(filename || "untitled-image");
      generatePreview(isTransparentBg);
      setIsExportDialogOpen(true);
   };

   const handleTransparentToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setIsTransparentBg(checked);
      generatePreview(checked);
   };

   const handleDownloadPng = () => {
      if (!previewUrl) return;
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = `${exportFilename.trim() || "untitled-image"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsExportDialogOpen(false);
   };

   const handleDownloadSvg = () => {
      if (!canvas) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let shapeCount = 0;
      canvas.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            const { x, y, width, height } = s.getBounds();
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
            shapeCount++;
         }
         return false;
      });

      if (shapeCount === 0) return;

      const padding = 20;
      const width = Math.max(1, maxX - minX + padding * 2);
      const height = Math.max(1, maxY - minY + padding * 2);

      let svgContent = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
      
      if (!isTransparentBg) {
         svgContent += `<rect width="100%" height="100%" fill="${canvas.background}" />`;
      }

      svgContent += `<g transform="translate(${-minX + padding}, ${-minY + padding})">`;
      
      canvas.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            if (typeof s.toSVG === "function") {
               svgContent += s.toSVG();
            }
         }
         return false;
      });
      
      svgContent += `</g></svg>`;

      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportFilename.trim() || "untitled-image"}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExportDialogOpen(false);
   };

   const handleSetTheme = (t: Theme) => {
      setTheme(t);
   }

   const handleSaveToDisk = () => {
      if (!canvas) return;

      const shapes: Record<string, any>[] = [];
      canvas.shapeStore.forEach((s) => {
         if (s.type !== "selection" && !s.groupId) {
            shapes.push(s.toObject());
         }
         return false;
      });

      const seen = new WeakSet();
      const jsonStr = JSON.stringify({ v: 1, shapes }, (_key, value) => {
         if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return undefined;
            seen.add(value);
         }
         return value;
      }, 2);

      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.trim() || "untitled-board"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
   };

   const handleLoadClick = () => {
      // Must be synchronous for browser security to allow the file picker to open
      const input = document.getElementById('global-board-upload');
      if (input) {
         // Setup a one-time focus listener to restore pointer-events when the file picker 
         // closes (especially when cancelled, since onChange won't fire)
         const handleFocus = () => {
            // Slight delay to ensure the browser has fully closed the picker
            setTimeout(() => {
               document.body.style.pointerEvents = "auto";
            }, 100);
            window.removeEventListener("focus", handleFocus);
         };
         window.addEventListener("focus", handleFocus);
         
         input.click();
      }
   };

   return (
      <div className="flex flex-col gap-4 w-fit p-1 md:p-2 font-sans">
         {/* Hidden file input placed entirely OUTSIDE of any Radix Dialog to prevent body scroll-lock freezing */}
         {/* Canvas Settings */}
         <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase px-1">
               Canvas
            </span>
            <div className="flex items-center justify-between px-1">
               <span className="text-sm font-medium text-foreground">Theme</span>
               <div className="flex items-center gap-0.5 p-0.5 rounded-lg border bg-muted/30">
                  <Button
                     variant="ghost"
                     onClick={() => handleSetTheme("light")}
                     className={cn(
                        "h-7 w-7 rounded-md p-0 hover:bg-background/80 transition-all text-muted-foreground",
                        theme === "light" && "bg-background shadow-sm text-foreground"
                     )}
                     title="Light Theme">
                     <SunIcon className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     onClick={() => handleSetTheme("dark")}
                     className={cn(
                        "h-7 w-7 rounded-md p-0 hover:bg-background/80 transition-all text-muted-foreground",
                        theme === "dark" && "bg-background shadow-sm text-foreground"
                     )}
                     title="Dark Theme">
                     <MoonIcon className="h-4 w-4" />
                  </Button>
               </div>
            </div>

            {/* Background Color */}
            <div className="flex flex-col gap-2 px-1 mt-2">
               <span className="text-sm font-medium text-foreground">Background</span>
               <div className="flex flex-wrap gap-1">
                  {BACKGROUNDS[resolvedTheme].map((color) => (
                     <button
                        key={color}
                        onClick={() => setBackground(color)}
                        className={cn(
                           "w-6 h-6 rounded-sm border border-border shadow-sm transition-all hover:scale-110",
                           background === color && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                     />
                  ))}
                  <Popover>
                     <PopoverTrigger asChild>
                        <button className="w-6 h-6 rounded-md border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-all text-xs text-muted-foreground">
                           <PlusIcon className="w-3 h-3" />
                        </button>
                     </PopoverTrigger>
                     <PopoverContent className="w-56 p-3" align="start">
                        <div className="flex flex-col gap-2">
                           <Label className="text-xs">Custom Hex Color</Label>
                           <div className="flex gap-2">
                              <Input 
                                 value={background} 
                                 onChange={(e) => setBackground(e.target.value)}
                                 className="h-8 flex-1"
                                 placeholder="#ffffff"
                              />
                              <div 
                                 className="w-8 h-8 rounded-md border shrink-0"
                                 style={{ backgroundColor: background }}
                              />
                           </div>
                        </div>
                     </PopoverContent>
                  </Popover>
               </div>
            </div>
         </div>

         <div className="h-px w-full bg-border/50" />

         {/* Actions */}
         <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase px-1">
               Actions
            </span>
            <Dialog open={isFileOpDialogOpen} onOpenChange={setIsFileOpDialogOpen}>
               <DialogTrigger asChild>
                  <Button
                     variant="secondary"
                     className="w-full flex justify-start items-center gap-2 h-9 text-sm font-medium bg-muted/50 hover:bg-muted"
                  >
                     <FolderOpenIcon className="h-4 w-4" />
                     Open / Export...
                  </Button>
               </DialogTrigger>
               <DialogContent 
                  className="sm:max-w-[425px]"
                  onInteractOutside={(e) => {
                     if (e.type === "focusoutside") {
                        e.preventDefault();
                     }
                  }}
               >
                  <DialogHeader>
                     <DialogTitle>File Operations</DialogTitle>
                     <DialogDescription>
                        Load a board from a file, export to image, or save your progress.
                     </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-6 py-4">
                     {/* Load Section */}
                     <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">Load</span>
                        <div className="p-3 bg-muted/30 rounded-md border border-border/50 flex flex-col gap-3">
                           <Button
                              variant="secondary"
                              className="w-full gap-2 justify-start"
                              onClick={handleLoadClick}
                           >
                              <UploadIcon className="h-4 w-4" />
                              Load from file
                           </Button>
                           <p className="text-[11px] text-destructive flex items-center">
                              * Warning: This will replace all current canvas content.
                           </p>
                        </div>
                     </div>

                     {/* Export Section */}
                     <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold">Export</span>
                        <div className="p-3 bg-muted/30 rounded-md border border-border/50 flex flex-col gap-3">
                           <Button
                              variant="secondary"
                              className="w-full gap-2 justify-start"
                              onClick={handleOpenExportDialog}
                           >
                              <ImageIcon className="h-4 w-4" />
                              Export to image (PNG)
                           </Button>

                           <div className="h-px bg-border/50 w-full my-1" />

                           <div className="flex flex-col gap-2">
                              <Label htmlFor="filename" className="text-xs text-muted-foreground">
                                 Save as JSON
                              </Label>
                              <div className="flex gap-2">
                                 <Input
                                    id="filename"
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                    className="h-9"
                                    placeholder="untitled-board"
                                 />
                                 <Button
                                    onClick={handleSaveToDisk}
                                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4"
                                 >
                                    <SaveIcon className="h-4 w-4" />
                                    Save
                                 </Button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </DialogContent>
            </Dialog>

            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
               <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                     <DialogTitle>Export Image</DialogTitle>
                     <DialogDescription>
                        Preview and configure your image export.
                     </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 py-2">
                     <div className="w-full h-[250px] bg-muted/30 border border-border/50 rounded-md flex items-center justify-center overflow-hidden"
                        style={{
                           backgroundImage: isTransparentBg
                              ? 'conic-gradient(rgba(0,0,0,0.1) 90deg, transparent 90deg 180deg, rgba(0,0,0,0.1) 180deg 270deg, transparent 270deg)'
                              : 'none',
                           backgroundSize: '20px 20px'
                        }}
                     >
                        {previewUrl ? (
                           <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-md" />
                        ) : (
                           <span className="text-muted-foreground text-sm">No shapes to export</span>
                        )}
                     </div>

                     <div className="grid gap-4 mt-2">
                        <div className="flex items-center gap-2">
                           <input
                              type="checkbox"
                              id="transparentBg"
                              checked={isTransparentBg}
                              onChange={handleTransparentToggle}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                           />
                           <Label htmlFor="transparentBg">Transparent Background</Label>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                           <Label htmlFor="exportFilename" className="text-right text-sm">
                              File Name
                           </Label>
                           <Input
                              id="exportFilename"
                              value={exportFilename}
                              onChange={(e) => setExportFilename(e.target.value)}
                              className="col-span-3 h-9"
                              placeholder="untitled-image"
                           />
                        </div>
                     </div>
                  </div>

                  <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                     <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                     </DialogClose>
                     <Button
                        onClick={handleDownloadPng}
                        disabled={!previewUrl}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                     >
                        <DownloadIcon className="h-4 w-4" />
                        Save as PNG
                     </Button>
                     <Button
                        variant="secondary"
                        onClick={handleDownloadSvg}
                        className="gap-2"
                     >
                        <DownloadIcon className="h-4 w-4" />
                        Save as SVG
                     </Button>
                  </DialogFooter>
               </DialogContent>
            </Dialog>

            <Dialog>
               <DialogTrigger asChild>
                  <Button
                     variant="destructive"
                     className="w-full flex justify-start items-center gap-2 h-9 text-sm font-medium"
                  >
                     <TrashIcon className="h-4 w-4" />
                     Reset Canvas
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                     <DialogTitle>Reset Canvas</DialogTitle>
                     <DialogDescription>
                        Are you sure you want to clear the entire canvas? This action can be undone.
                     </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                     <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                     </DialogClose>
                     <DialogClose asChild>
                        <Button
                           variant="destructive"
                           onClick={() => {
                              if (!canvas) return;
                              const allShapes: any[] = [];
                              canvas.shapeStore.forEach((s) => {
                                 if (s.type !== "selection" && !s.groupId) {
                                    allShapes.push(s);
                                 }
                                 return false;
                              });
                              if (allShapes.length > 0) {
                                 allShapes.forEach((s) => canvas.shapeStore.removeById(s.ID()));
                                 canvas.activeShapes = null;
                                 canvas.fire("shape:delete", { e: { target: allShapes } });
                                 canvas.renderImmediate();
                              }
                           }}
                        >
                           Yes, Clear Board
                        </Button>
                     </DialogClose>
                  </DialogFooter>
               </DialogContent>
            </Dialog>
         </div>
      </div>
   )
}
