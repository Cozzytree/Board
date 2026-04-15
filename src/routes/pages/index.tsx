import { createFileRoute } from "@tanstack/react-router";
import { Paintbrush } from "lucide-react";

export const Route = createFileRoute("/pages/")({
  component: PagesIndex,
});

function PagesIndex() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed]/20 to-[#06b6d4]/20 flex items-center justify-center mx-auto mb-4">
          <Paintbrush size={32} className="text-[#7c3aed]" />
        </div>
        <h2 className="text-xl font-semibold text-[#cdd6f4] mb-2">
          Select a page
        </h2>
        <p className="text-[#6c7086]">
          Choose a page from the sidebar to start editing, or create a new one.
        </p>
      </div>
    </div>
  );
}

export default PagesIndex;
