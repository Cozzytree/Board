import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import React from "react";
import { Paintbrush, LogOut, ChevronDown } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { PagesSidebar } from "./_components/pages-sidebar";

export const Route = createFileRoute("/pages")({
  component: PagesLayout,
});

function PagesLayout() {
  const navigate = useNavigate();
  const { data: session, isPending } = useSession();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  React.useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/" });
    }
  }, [isPending, session, navigate]);

  if (isPending || !session) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-muted border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-muted bg-background">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center">
            <Paintbrush size={16} className="text-white" />
          </div>
          <span className="font-semibold">Board</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
              hover:bg-[#313244]/50 transition-colors">
            {session.user.image ? (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            )}
            <ChevronDown size={14} className="text-[#6c7086]" />
          </button>

          {showUserMenu && (
            <div
              className="absolute top-full right-0 mt-2 w-48 rounded-xl
              bg-background border border-muted shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-muted">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs ">@{session.user.username}</p>
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate({ to: "/" });
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#f38ba8]
                  hover:bg-muted transition-colors">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <PagesSidebar />

        {/* Page Content */}
        <main className="flex-1 relative overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default PagesLayout;
