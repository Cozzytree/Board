import { BoardProvider } from "@/board/board_provider";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
   component: Index,
});

function Index() {
   return (
      <div className="w-full h-full">
         <BoardProvider />
      </div>
   );
}
