import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React from "react";
import { Paintbrush, Users, ArrowRight, Zap, Globe, Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [joinId, setJoinId] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const createRoom = React.useCallback(() => {
    setIsCreating(true);
    // Generate a short room ID
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    navigate({ to: "/room/$roomId", params: { roomId: id } });
  }, [navigate]);

  const joinRoom = React.useCallback(() => {
    let id = joinId.trim();
    if (!id) return;

    // Support pasting full URLs
    try {
      const url = new URL(id);
      const parts = url.pathname.split("/");
      const roomIdx = parts.indexOf("room");
      if (roomIdx !== -1 && parts[roomIdx + 1]) {
        id = parts[roomIdx + 1];
      }
    } catch {
      // Not a URL, treat as raw room ID
    }

    navigate({ to: "/room/$roomId", params: { roomId: id } });
  }, [joinId, navigate]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") joinRoom();
    },
    [joinRoom]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#cdd6f4] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#7c3aed]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#06b6d4]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-[#f43f5e]/6 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-6 max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] flex items-center justify-center shadow-xl shadow-[#7c3aed]/20">
            <Paintbrush size={28} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-[#cdd6f4] via-[#b4befe] to-[#89b4fa] bg-clip-text text-transparent">
            Board
          </h1>
          <p className="text-[#6c7086] text-lg text-center max-w-md">
            A collaborative whiteboard for sketching, diagramming, and
            brainstorming — in real time.
          </p>
        </div>

        {/* Action cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Room */}
          <button
            onClick={createRoom}
            disabled={isCreating}
            className="group relative flex flex-col gap-3 p-6 rounded-2xl
              bg-gradient-to-br from-[#1e1e2e] to-[#181825]
              border border-[#313244] hover:border-[#7c3aed]/50
              transition-all duration-300
              hover:shadow-xl hover:shadow-[#7c3aed]/10
              cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/15 flex items-center justify-center group-hover:bg-[#7c3aed]/25 transition-colors">
              <Users size={20} className="text-[#b4befe]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#cdd6f4] mb-1">
                Create a Room
              </h3>
              <p className="text-sm text-[#6c7086]">
                Start a new collaborative session and invite others with a link.
              </p>
            </div>
            <ArrowRight
              size={16}
              className="absolute top-6 right-6 text-[#45475a] group-hover:text-[#b4befe] group-hover:translate-x-1 transition-all"
            />
          </button>

          {/* Local Board */}
          <Link
            to="/local"
            className="group relative flex flex-col gap-3 p-6 rounded-2xl
              bg-gradient-to-br from-[#1e1e2e] to-[#181825]
              border border-[#313244] hover:border-[#06b6d4]/50
              transition-all duration-300
              hover:shadow-xl hover:shadow-[#06b6d4]/10
              cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#06b6d4]/15 flex items-center justify-center group-hover:bg-[#06b6d4]/25 transition-colors">
              <Paintbrush size={20} className="text-[#89dceb]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#cdd6f4] mb-1">
                Open Local Board
              </h3>
              <p className="text-sm text-[#6c7086]">
                Work offline with your shapes saved to your browser.
              </p>
            </div>
            <ArrowRight
              size={16}
              className="absolute top-6 right-6 text-[#45475a] group-hover:text-[#89dceb] group-hover:translate-x-1 transition-all"
            />
          </Link>
        </div>

        {/* Join room input */}
        <div className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a room ID or link to join…"
              className="flex-1 px-4 py-3 rounded-xl bg-[#1e1e2e] border border-[#313244]
                text-sm text-[#cdd6f4] placeholder-[#45475a]
                focus:outline-none focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/20
                transition-all font-mono"
            />
            <button
              onClick={joinRoom}
              disabled={!joinId.trim()}
              className="px-5 py-3 rounded-xl bg-[#7c3aed] text-white text-sm font-medium
                hover:bg-[#9333ea] disabled:opacity-30 disabled:cursor-not-allowed
                transition-all shadow-lg shadow-[#7c3aed]/20"
            >
              Join
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap justify-center gap-6 text-xs text-[#6c7086]">
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-[#f9e2af]" />
            Real-time sync
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={12} className="text-[#89b4fa]" />
            No sign-up needed
          </span>
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-[#a6e3a1]" />
            Peer-to-peer via CRDT
          </span>
        </div>
      </div>
    </div>
  );
}

export default Index;
