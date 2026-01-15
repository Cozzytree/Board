import { BoardProvider } from "@/board/board_provider";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [width, setWidth] = React.useState(window.innerWidth);
  const [height, setHeight] = React.useState(window.innerHeight);
  const handleWindow = React.useCallback(() => {
    setWidth(window.innerWidth);
    setHeight(window.innerHeight);
  }, []);

  React.useEffect(() => {
    window.addEventListener("resize", handleWindow);

    return () => {
      window.removeEventListener("resize", handleWindow);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <BoardProvider width={width} height={height} />
    </div>
  );
}
