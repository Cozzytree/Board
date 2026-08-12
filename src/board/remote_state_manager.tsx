import React from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import ActiveSelection from "./shapes/active_selection";
import { CURSOR_COLORS } from "./constants";
import { useBoard } from "./board-context";

function getColorForClient(clientId: number): string {
  return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

type CursorData = {
  x: number;
  y: number;
  id?: number;
  name?: string
}

type RemoteCursor = {
  clientId: number;
  cursor: CursorData;
}

export default function RemoteStateManager({ view, provider }: { provider: HocuspocusProvider, view: { x: number, y: number, scl: number } }) {
  const [cursors, setCursors] = React.useState<RemoteCursor[]>([]);
  const { activeShape, canvas } = useBoard();

  React.useEffect(() => {
    if (!provider) return;
    if (!activeShape) {
      provider.awareness?.setLocalStateField("selection", { ids: [] });
      return;
    }

    if (activeShape instanceof ActiveSelection) {
      const ids = activeShape.shapes.map((s) => s.s.ID());
      provider.awareness?.setLocalStateField("selection", { ids })
    } else {
      provider.awareness?.setLocalStateField("selection", {
        ids: [activeShape.ID()]
      })
    }
  }, [activeShape])


  React.useEffect(() => {
    if (!provider || !canvas) return;
    const updateCursors = () => {
      const states = provider.awareness?.getStates();
      const localID = provider.awareness?.clientID;
      const remoteCursors: RemoteCursor[] = [];
      if (!states) return;

      states.forEach((state, clientId) => {
        if (clientId === localID) return;
        if (state.cursor && typeof state.cursor.x === "number") {
          remoteCursors.push({
            clientId,
            cursor: state.cursor as CursorData
          });
        }

        if (state?.selection && state.selection?.ids && state.selection.ids.length > 0) {
          canvas.remoteSelections.set(clientId, {
            color: getColorForClient(clientId),
            shapeIds: state.selection.ids as string[],
          });
        } else {
          canvas.remoteSelections.delete(clientId);
        }
      })

      for (const [clientID] of canvas.remoteSelections.entries()) {
        if (!states.has(clientID)) {
          canvas.remoteSelections.delete(clientID);
        }
      }

      canvas.renderRemoteSelectionsAsync();
      setCursors(remoteCursors);
    }

    provider.awareness?.on("change", updateCursors);
    return () => {
      provider.awareness?.off("change", updateCursors);
    }
  }, [provider, canvas])

  return <CursorOverlay cursors={cursors} view={view} />
}

function CursorOverlay({ cursors, view }: { cursors: RemoteCursor[], view?: { x: number, y: number, scl: number } }) {
  if (cursors.length === 0) return;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 45 }}>
      {cursors.map(({ clientId, cursor }) => {
        const color = getColorForClient(clientId);
        const screenX = view ? cursor.x * view.scl + view.x : cursor.x;
        const screenY = view ? cursor.y * view.scl + view.y : cursor.y;

        return (
          <div
            key={clientId}
            className="absolute"
            style={{
              left: screenX,
              top: screenY,
              transition: "left 80ms linear, top 80ms linear",
            }}>
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}>
              <path
                d="M0.928711 0.514648L14.9287 8.51465L7.92871 10.5146L4.92871 18.5146L0.928711 0.514648Z"
                fill={color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="absolute left-4 top-4 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
              style={{
                backgroundColor: color,
                color: "white",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }}>
              {cursor.name || `User ${clientId.toString().slice(-4)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
