import React from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";

type RealTimeContextValue = {
    provider: HocuspocusProvider | null;
    doc: Y.Doc;
};

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
