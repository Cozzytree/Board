import React, { useEffect, useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Library, Upload } from "lucide-react";
import { type SavedLibraryItem, getAllLibraryItems, saveLibraryItems } from "../utils/library_db";
import { useBoard } from "../board-context";
import ExcalidrawShape from "../shapes/excalidraw_shape";
import { LibraryMarketplace } from "./library_marketplace";
import type { LibraryItem } from "../types";

export { LibrarySidebar as BoardLibrarySidebar };

function ExcalidrawPreview({ elements }: { elements: LibraryItem[] }) {
   const canvasRef = useRef<HTMLCanvasElement>(null);

   useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill with a white background so black Excalidraw strokes are visible in dark mode
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const shape = new ExcalidrawShape({
         elements: elements,
         left: 0,
         top: 0,
         ctx: ctx,
      });

      const padding = 8;
      const availableSize = canvas.width - padding * 2;

      const w = shape.width || 1;
      const h = shape.height || 1;
      const scaleX = availableSize / w;
      const scaleY = availableSize / h;
      const scale = Math.min(scaleX, scaleY, 1);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);

      shape.left = -w / 2;
      shape.top = -h / 2;

      shape.draw({ ctx, resize: false });
      ctx.restore();

      // Debug: removed blue border
   }, [elements]);

   return (
      <canvas
         ref={canvasRef}
         width={128}
         height={128}
         className="w-12 h-12 mb-1 pointer-events-none rounded border border-border"
      />
   );
}

export function LibrarySidebar() {
   const [items, setItems] = useState<SavedLibraryItem[]>([]);
   const { canvas } = useBoard();
   const fileInputRef = useRef<HTMLInputElement>(null);

   const loadItems = useCallback(async () => {
      const dbItems = await getAllLibraryItems();
      // Filter out corrupted items where elements is an array of arrays
      const validItems = dbItems.filter(item =>
         Array.isArray(item.elements) &&
         item.elements.length > 0
      );

      setItems(validItems);
   }, []);

   useEffect(() => {
      void loadItems();
   }, []);

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
         try {
            const json = JSON.parse(event.target?.result as string);
            if (json.type === "excalidrawlib" || json.type === "board-library") {
               let libraryItems: any[] = [];
               if (json.libraryItems) {
                  libraryItems = json.libraryItems;
               } else if (json.library) {
                  libraryItems = json.library.map((elementGroup: any[]) => ({
                     id: Math.random().toString(36).substring(2, 9),
                     status: "published",
                     elements: elementGroup
                  }));
               }
               if (libraryItems.length > 0) {
                  await saveLibraryItems(libraryItems);
                  await loadItems();
               }
            }
         } catch (err) {
            console.error("Failed to parse library file", err);
         }
         if (fileInputRef.current) fileInputRef.current.value = "";
      };
      reader.readAsText(file);
   };

   const insertElementsLibraryItem = useCallback((item: LibraryItem[]) => {
      const activeCanvas = canvas;
      if (!activeCanvas || !Array.isArray(item) || item.length === 0) {
         console.log("canvas=", activeCanvas, item);
         return;
      };
      const targetPoint = {
         x: -activeCanvas.view.x + (activeCanvas.canvas.width / 2) / activeCanvas.view.scl,
         y: -activeCanvas.view.y + (activeCanvas.canvas.height / 2) / activeCanvas.view.scl
      };

      // Wrap raw Excalidraw elements in the ExcalidrawShape adapter
      const shape = new ExcalidrawShape({
         left: 0,
         top: 0,
         elements: item,
         ctx: canvas.ctx,
         _board: canvas,
      });

      // Center the loaded shape exactly on the mouse point
      shape.set({
         left: targetPoint.x - shape.width / 2,
         top: targetPoint.y - shape.height / 2,
      });

      activeCanvas.add(shape);
      activeCanvas.fire("shape:created", { e: { target: [shape], x: targetPoint.x, y: targetPoint.y } });
      activeCanvas.render();
      console.log("shape inserted", shape);
   }, [canvas]);

   return (
      <Sheet>
         <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur">
               <Library className="h-4 w-4" />
            </Button>
         </SheetTrigger>
         <SheetContent className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
               <SheetTitle>Asset Library</SheetTitle>
               <SheetDescription>Import and use custom shapes</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-2">
               <Button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" /> Load from file
               </Button>
               <LibraryMarketplace onInstalled={loadItems} />
               <input type="file" ref={fileInputRef} className="hidden" accept=".json,.excalidrawlib" onChange={handleFileUpload} />

               <div className="flex flex-col gap-2 px-2 w-full justify-center">
                  {items?.map((item, idx) => {
                     return (
                        <div key={item.id}>
                           <span className="text-lg font-bold line-clamp-1 mt-1 truncate w-full">
                              {item.name || "Library Item"}
                           </span>
                           <div className="grid grid-cols-3 gap-1">
                              {item.elements.map((el, i) =>
                                 <div
                                    key={item.id || idx}
                                    className="h-32 border rounded cursor-pointer hover:bg-accent flex flex-col items-center justify-center p-2 text-muted-foreground group"
                                    onClick={() => {
                                       insertElementsLibraryItem(el);
                                    }}
                                 >
                                    <ExcalidrawPreview elements={el} key={i} />
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
                  {items.length === 0 && <div className="col-span-2 text-center text-muted-foreground text-sm py-8 border border-dashed rounded bg-accent/30">No items in library</div>}
               </div>
            </div>
         </SheetContent>
      </Sheet>
   );
}
