import { ArrowLeft } from "lucide-react";
import { useBoard } from "../board-context";
import { Button } from "@/components/ui/button";

export function BoardCenterButton() {
  const { offset, handleCenter } = useBoard();

  if (Math.abs(offset[0]) <= 100 && Math.abs(offset[1]) <= 100) {
    return null;
  }

  return (
    <div className="w-fit h-fit">
      <Button className="cursor-pointer" onClick={handleCenter} variant={"secondary"} size={"sm"}>
        <ArrowLeft width={8} /> <span className="hidden md:block text-xs">Back to center</span>
      </Button>
    </div>
  );
}
