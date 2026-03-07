import { PlusIcon, MinusIcon } from "lucide-react";
import { useBoard } from "../board-context";
import { Button } from "@/components/ui/button";

export function BoardZoomControls() {
  const { zoom, handleZoom } = useBoard();

  return (
    <div className="z-50 fixed left-4 bottom-5 flex items-center gap-2">
      <Button
        onClick={() => {
          handleZoom(true);
        }}
        variant={"secondary"}
        size={"xs"}
        className="cursor-pointer">
        <PlusIcon />
      </Button>
      <span className="text-sm">{zoom.toFixed(0)} %</span>
      <Button
        onClick={() => {
          handleZoom(false);
        }}
        variant={"secondary"}
        size={"xs"}
        className="cursor-pointer">
        <MinusIcon />
      </Button>
    </div>
  );
}
