import { BoardProvider } from "@/board/board_provider";
import { BoardToolbar } from "@/board/components/toolbar";
import { BoardShapeOptions } from "@/board/components/shapeoptions";
import { BoardZoomControls } from "@/board/components/zoom_controls";
import { BoardCenterButton } from "@/board/components/center_button";
import { BoardLibrarySidebar } from "@/board/components/library_sidebar";
import { useBoard } from "@/board/board-context";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTheme } from "@/components/theme-provider";
import { StatsForNerds } from "@/board/components/stat";

export const Route = createFileRoute("/local")({
    component: LocalBoardPage,
});

function LocalBoardPage() {
    const { theme } = useTheme();
    const [width, setWidth] = React.useState(window.innerWidth);
    const [height, setHeight] = React.useState(window.innerHeight);
    const handleWindow = React.useCallback(() => {
        setWidth(window.innerWidth);
        setHeight(window.innerHeight);
    }, []);

    React.useEffect(() => {
        window.addEventListener("resize", handleWindow);
        return () => window.removeEventListener("resize", handleWindow);
    }, [handleWindow]);

    return (
        <div className="w-full h-full">
            <BoardProvider theme={theme || "light"} width={width} height={height}>
                <BoardUI />
            </BoardProvider>
        </div>
    );
}

/** Separated so it can call useBoard() inside the provider tree */
function BoardUI() {
    const { isMinimal, activeShape } = useBoard();

    return (
      <>
            <div className="pointer-events-auto z-50 fixed left-1/2 -translate-x-1/2 bottom-4 flex justify-center max-w-[95vw] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {!isMinimal && <BoardToolbar />}
            </div>
            {!isMinimal && <BoardLibrarySidebar />}

            <div className="absolute z-[999] top-4 right-16">
                <BoardCenterButton />
            </div>
            <div className="absolute z-[999] bottom-2 left-2 hidden md:flex">
                <BoardZoomControls />
            </div>
            {!isMinimal && activeShape && (
                <div className="absolute z-[999] top-4 left-1/2 -translate-x-1/2 max-w-[90vw] md:max-w-none overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <BoardShapeOptions />
                </div>
            )}
            <StatsForNerds className="fixed z-[999] top-20 right-5" />
        </>
    );
}
