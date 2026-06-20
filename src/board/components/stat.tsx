import { cn } from "@/lib/utils";
import { useBoard } from "../board-context";
import { X } from "lucide-react";
import React from "react";

type ClassProps = {
    className?: string;
};

export function StatsForNerds({ className }: ClassProps) {
    const { canvas, activeShape, stat, setStat, zoom, offset } = useBoard();

    // Re-render when canvas triggers an update
    const [, forceUpdate] = React.useState(0);
    const [sceneSizeKb, setSceneSizeKb] = React.useState("0.00");

    React.useEffect(() => {
        if (!canvas) return;
        const onUpdate = () => forceUpdate((n) => n + 1);
        
        // Calculate heavy stringification independently from the 60fps render loop
        const calculateSize = () => {
            const shapes: any[] = [];
            canvas.shapeStore.forEach((s) => {
                if (s.type !== "selection" && !s.groupId) {
                    shapes.push(s.toObject());
                }
                return false;
            });
            try {
                const str = JSON.stringify(shapes);
                setSceneSizeKb((new Blob([str]).size / 1024).toFixed(2));
            } catch (e) {
                console.error(e);
            }
        };

        canvas.on("shape:updated", onUpdate);
        canvas.on("shape:created", onUpdate);
        canvas.on("shape:delete", onUpdate);

        canvas.on("shape:updated", calculateSize);
        canvas.on("shape:created", calculateSize);
        canvas.on("shape:delete", calculateSize);
        
        calculateSize();

        return () => {
        };
    }, [canvas]);

    if (!stat) return null;

    // Filter out transient elements like 'selection' from the total count
    let totalShapes = 0;
    if (canvas) {
        canvas.shapeStore.forEach((s) => {
            if (s.type !== "selection") totalShapes++;
            return false;
        });
    }

    let selectedCount = 0;
    if (activeShape) {
        if (activeShape.type === "selection") {
            selectedCount = (activeShape as any).shapes?.length || 0;
        } else {
            selectedCount = 1;
        }
    }

    return (
        <div className={cn("bg-background shadow-xl border border-gray-200 dark:border-[#313244] rounded-lg p-3 md:p-4 w-48 md:w-64 pointer-events-auto", className)}>
            <div className="flex justify-between items-center mb-3 md:mb-4">
                <h3 className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">Stats for nerds</h3>
                <button onClick={() => setStat(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#313244] transition-colors">
                    <X size={14} />
                </button>
            </div>
            
            <div className="space-y-1 md:space-y-2 text-[10px] md:text-xs font-mono text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                    <span>Elements:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{totalShapes}</span>
                </div>
                <div className="flex justify-between">
                    <span>Selected:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedCount}</span>
                </div>
                <div className="flex justify-between">
                    <span>Zoom:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(zoom)}%</span>
                </div>
                <div className="flex justify-between">
                    <span>Offset X:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(offset[0])}</span>
                </div>
                <div className="flex justify-between">
                    <span>Offset Y:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(offset[1])}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-[#313244] mt-2 pt-2">
                    <span>Scene Size:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{sceneSizeKb} KB</span>
                </div>
                {activeShape && activeShape.type !== "selection" && (
                    <>
                        <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 dark:border-[#313244]">
                            <span>Width:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(activeShape.width)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Height:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(activeShape.height)}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
