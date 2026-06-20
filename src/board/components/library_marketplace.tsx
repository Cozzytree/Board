import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Store, Loader2, Check } from "lucide-react";
import { saveLibraryItems, type SavedLibraryItem } from "../utils/library_db";
import type { LibraryItem } from "../types";

type ExcalidrawLibraryDef = {
    id: string;
    name: string;
    description: string;
    source: string;
    preview: string;
};

type Res = {
    type: string,
    version: number,
    library: LibraryItem[][]
}

export function LibraryMarketplace({ onInstalled }: { onInstalled: () => void }) {
    const [libraries, setLibraries] = useState<ExcalidrawLibraryDef[]>([]);
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch("https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/main/libraries.json")
            .then(res => res.json())
            .then(data => setLibraries(data))
            .catch(err => console.error("Failed to load libraries", err));
    }, []);

    const handleInstall = async (lib: ExcalidrawLibraryDef) => {
        try {
            setInstallingId(lib.id);
            const res = await fetch(`https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/main/libraries/${lib.source}`);
            const data = await res.json() as Res;

            if (!data.library && !Array.isArray(data.library)) return;
            const items: SavedLibraryItem = {
                elements: data.library,
                id: lib.id,
                name: lib.name,
                status: "",
            }
            await saveLibraryItems(items);
            setInstalledIds(prev => new Set(prev).add(lib.id));
            onInstalled();
        } catch (err) {
            console.error("Failed to install library", err);
        } finally {
            setInstallingId(null);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary" className="w-full flex items-center justify-center gap-2 mt-2">
                    <Store className="w-4 h-4" /> Browse Public Libraries
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col p-4 md:p-6 overflow-hidden z-[9999]">
                <DialogHeader>
                    <DialogTitle>Icon Library Marketplace</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6 mt-4">
                    {libraries.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
                            <Loader2 className="animate-spin w-8 h-8" />
                            <span>Loading public libraries from Excalidraw...</span>
                        </div>
                    ) : (
                        libraries.map(lib => (
                            <div key={lib.id} className="border rounded-xl p-3 flex flex-col gap-3 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                                <div className="aspect-video bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center p-4">
                                    <img
                                        src={`https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/main/libraries/${lib.preview}`}
                                        alt={lib.name}
                                        className="max-w-full max-h-full object-contain filter dark:invert"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="flex-1 px-1">
                                    <h3 className="font-semibold text-sm line-clamp-1" title={lib.name}>{lib.name}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1" title={lib.description}>{lib.description}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant={installedIds.has(lib.id) ? "outline" : "default"}
                                    disabled={installingId === lib.id || installedIds.has(lib.id)}
                                    onClick={() => handleInstall(lib)}
                                    className="w-full mt-auto font-medium cursor-pointer"
                                >
                                    {installingId === lib.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                        installedIds.has(lib.id) ? <><Check className="w-4 h-4 mr-1" /> Installed</> :
                                            <><Download className="w-4 h-4 mr-1" /> Install</>}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
