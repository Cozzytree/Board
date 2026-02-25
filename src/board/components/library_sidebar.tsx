import React, { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Library, Upload, Shapes } from "lucide-react";
import { type LibraryItem, getAllLibraryItems, saveLibraryItems } from "../utils/library_db";
import { useBoard } from "../board-context";

export function LibrarySidebar() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const { setMode, canvas } = useBoard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    const dbItems = await getAllLibraryItems();
    setItems(dbItems);

    // Register loaded shapes onto the canvas
    if (canvas && dbItems.length > 0) {
      for (const item of dbItems) {
        // board-library format: item has a raw `svg` string
        if (item.svg && item.name) {
          const success = canvas.registerSvgIcon(item.name, item.svg);
          if (!success) {
            console.error("Failed to register SVG for library item:", item.name);
          }
          continue;
        }

        // excalidrawlib format: item has `elements` array — skip for now
        // (would require excalidraw's exportToSvg, which is heavy)
        if (item.elements && item.elements.length > 0) {
          console.warn("Excalidraw element-based library items are not yet supported:", item.id);
        }
      }
    }
  };

  useEffect(() => {
    loadItems();
  }, [canvas]);

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
                  onClick={() => setMode("shape", shapeKey as any)}
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
