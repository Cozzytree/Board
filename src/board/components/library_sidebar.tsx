import React, { useEffect, useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Library, Upload, Shapes } from "lucide-react";
import { type LibraryItem, getAllLibraryItems, saveLibraryItems } from "../utils/library_db";
import { useBoard } from "../board-context";
import { generateShapeByShapeType } from "../utils/utilfunc";
import type Shape from "../shapes/shape";

export { LibrarySidebar as BoardLibrarySidebar };
export function LibrarySidebar() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const { setMode, canvas } = useBoard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasLoadedRef = useRef(false);

  const loadItems = useCallback(async () => {
    const dbItems = await getAllLibraryItems();
    setItems(dbItems);

    if (canvas && dbItems.length > 0) {
      for (const item of dbItems) {
        if (item.svg && item.name) {
          canvas.registerSvgIcon(item.name, item.svg);
        }
      }
    }
  }, [canvas]);

  useEffect(() => {
    if (!canvas || canvasLoadedRef.current) return;
    canvasLoadedRef.current = true;
    void loadItems();
  }, [canvas, loadItems]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.type === "excalidrawlib" || json.type === "board-library") {
          const libraryItems = json.libraryItems || [];
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

  const insertElementsLibraryItem = (item: LibraryItem) => {
    if (!canvas || !Array.isArray(item.elements) || item.elements.length === 0) return;

    const generated: Shape[] = [];
    for (const element of item.elements) {
      const shape = generateShapeByShapeType(element as any, canvas, canvas.ctx);
      if (shape) {
        generated.push(shape);
      }
    }

    if (generated.length === 0) {
      console.warn("No supported shapes to insert from library item:", item.id);
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const shape of generated) {
      minX = Math.min(minX, shape.left);
      minY = Math.min(minY, shape.top);
      maxX = Math.max(maxX, shape.left + shape.width);
      maxY = Math.max(maxY, shape.top + shape.height);
    }

    const centerX = minX + (maxX - minX) * 0.5;
    const centerY = minY + (maxY - minY) * 0.5;
    const targetPoint = canvas._lastMousePosition || { x: canvas.canvas.width * 0.5, y: canvas.canvas.height * 0.5 };

    const dx = targetPoint.x - centerX;
    const dy = targetPoint.y - centerY;

    generated.forEach((shape) => {
      shape.set({
        left: shape.left + dx,
        top: shape.top + dy,
      });
    });

    canvas.add(...generated);
    canvas.fire("shape:created", { e: { target: generated, x: targetPoint.x, y: targetPoint.y } });
    canvas.render();
  };

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
        <div className="mt-4 flex flex-col gap-4">
          <Button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2">
            <Upload className="w-4 h-4" /> Load Library
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json,.excalidrawlib" onChange={handleFileUpload} />

          <div className="grid grid-cols-2 gap-2 mt-4">
            {items.map((item) => {
              const displayName = item.name || `Item ${item.id}`;
              // Use item.name (the registered shape key) for setMode, fall back to item.id
              const shapeKey = item.name || item.id;
              return (
                <div
                  key={item.id}
                  className="aspect-video max-h-24 border rounded cursor-pointer hover:bg-accent flex flex-col items-center justify-center p-2 text-muted-foreground group"
                  onClick={() => {
                    if (item.svg) {
                      setMode("shape", shapeKey as any);
                      return;
                    }

                    if (item.elements && item.elements.length > 0) {
                      insertElementsLibraryItem(item);
                    }
                  }}
                >
                  {item.svg ? (
                    <div
                      className="w-8 h-8 mb-1"
                      dangerouslySetInnerHTML={{ __html: item.svg }}
                    />
                  ) : (
                    <Shapes className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="text-[10px] text-center w-full truncate font-medium">
                    {displayName}
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
