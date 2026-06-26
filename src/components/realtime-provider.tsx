import React, { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

type RealTimeContextValue = {
   provider: HocuspocusProvider | null;
   doc: Y.Doc;
};

const CURSOR_COLORS = [
   "#f43f5e",
   "#8b5cf6",
   "#06b6d4",
   "#f59e0b",
   "#10b981",
   "#ec4899",
   "#3b82f6",
   "#ef4444",
   "#14b8a6",
   "#a855f7",
];

function getColorForClient(clientId: number): string {
   return CURSOR_COLORS[clientId % CURSOR_COLORS.length];
}

const RealTimeContext = React.createContext<RealTimeContextValue | undefined>(undefined);

export const useRealTime = () => {
   const ctx = React.useContext(RealTimeContext);
   if (!ctx) throw new Error("useRealTime must be used within RealTimeProvider");
   return ctx;
};

export const RealTimeProvider = ({
   children,
   url,
   docName,
   token,
}: {
   children: React.ReactNode;
   url: string;
   docName: string;
   token?: string;
}) => {
   const [provider, setProvider] = React.useState<HocuspocusProvider | null>(null);
   const docRef = React.useRef(new Y.Doc());

   React.useEffect(() => {
      const doc = docRef.current;
      const hp = new HocuspocusProvider({
         url,
         name: docName,
         document: doc,
         token: token ?? "",
         onOpen: () => console.log("[hocuspocus-client] connected"),
         onClose: (data) => console.log("[hocuspocus-client] closed", data),
         onSynced: (data) => console.log("[hocuspocus-client] synced", data),
         onMessage: () => console.log("[hocuspocus-client] message received"),
         onStatus: (data) => console.log("[hocuspocus-client] status:", data.status),
         onDisconnect: (data) => console.log("[hocuspocus-client] disconnected", data),
      });

      setProvider(hp);

      return () => {
         hp.destroy();
      };
   }, [url, docName, token]);

   return (
      <RealTimeContext.Provider value={{ provider, doc: docRef.current }}>
         {children}
      </RealTimeContext.Provider>
   );
};

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

export function CursorStateManager({ view, board }: { view: { x: number, y: number, scl: number }, board?: any }) {
   const { provider } = useRealTime();
   const [cursors, setCursors] = useState<RemoteCursor[]>([]);
   useEffect(() => {
      if (!provider) return;
      const updateCursors = () => {
         const states = provider.awareness?.getStates();
         const localID = provider.awareness?.clientID;
         const remoteCursors: RemoteCursor[] = [];

         states?.forEach((state, clientId) => {
            if (clientId === localID) return;
            if (state.cursor && typeof state.cursor.x === "number") {
               remoteCursors.push({
                  clientId,
                  cursor: state.cursor as CursorData
               });
            }

            if (board) {
               if (state.selection && Array.isArray(state.selection)) {
                  board.remoteSelections.set(clientId, {
                     color: getColorForClient(clientId),
                     shapeIds: state.selection
                  });
               } else {
                  board.remoteSelections.delete(clientId);
               }
            }
         })

         if (board) {
            // Remove any clients that disconnected or removed selection
            for (const [clientId] of board.remoteSelections.entries()) {
               if (!states.has(clientId)) {
                  board.remoteSelections.delete(clientId);
               }
            }
            board.render();
         }

         setCursors(remoteCursors);
      }

      provider.awareness?.on("change", updateCursors);
      return () => {
         provider.awareness?.off("change", updateCursors);
         if (board) {
            board.remoteSelections.clear();
            board.render();
         }
      }
   }, [board, provider])

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
