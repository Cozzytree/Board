import { auth } from "./auth";
import { initPageHandler } from "./handlers/pages.handler";
import { initShapeHandler } from "./handlers/shapes.handler";
import { initSessionHandler } from "./handlers/sessions.handler";
import { createRepos } from "./repo";
import { db } from "./db";
import { hocuspocus } from "./hoduspocus_instance";

const port = 3000;

// ── Bun Server ──
type WSData = {
    roomId: string;
    request: Request;
    clientConnection?: ReturnType<typeof hocuspocus.handleConnection>;
};

const repos = createRepos(db);
const pageHandler = initPageHandler(repos, auth);
const shapeHandler = initShapeHandler(repos, auth);
const sessionHandler = initSessionHandler(repos, auth);

const ALLOWED_ORIGINS = ["http://localhost:5173", "http://localhost:4173"];

function corsHeaders(): Headers {
    return new Headers({
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
    });
}

async function authHandlerWrapper(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }
    const response = await auth.handler(req);
    const cors = corsHeaders();
    const newHeaders = new Headers(response.headers);
    cors.forEach((value, key) => {
        if (!newHeaders.has(key)) {
            newHeaders.set(key, value);
        }
    });
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
    });
}

function withCors(handler: (req: Bun.BunRequest) => Promise<Response>) {
    return async (req: Bun.BunRequest): Promise<Response> => {
        const response = await handler(req);

        const cors = corsHeaders();
        const headers = new Headers(response.headers);

        cors.forEach((value, key) => {
            if (!headers.has(key)) headers.set(key, value);
        });

        // Avoid double compression
        if (headers.has("Content-Encoding")) {
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        }

        const body = response.body ? await response.body.bytes() : null;
        if (!body || body.length < 1024) {
            return new Response(body, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        }

        const acceptEncoding = req.headers.get("accept-encoding") || "";

        if (acceptEncoding.includes("gzip")) {
            const compressed = Bun.gzipSync(body);

            headers.set("Content-Encoding", "gzip");
            headers.set("Content-Length", compressed.length.toString());
            headers.set("Vary", "Accept-Encoding");

            return new Response(compressed, {
                status: response.status,
                statusText: response.statusText,
                headers,
            });
        }

        return new Response(body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    };
}

const server = Bun.serve<WSData>({
    port,
    fetch(req) {
        const cors = corsHeaders();
        if (req.method === "OPTIONS") {
            return new Response("Departed", { status: 204, headers: cors });
        }
        return new Response(null, { status: 404 });
    },
    routes: {
        "/api/auth/*": authHandlerWrapper,
        "/page/create": { POST: withCors((req) => pageHandler.createPage(req)) },
        "/page/get": { GET: withCors((req) => pageHandler.getPage(req)) },
        "/page/user": { GET: withCors((req) => pageHandler.getPagesByUser(req)) },
        "/page/update": { PATCH: withCors((req) => pageHandler.updatePage(req)) },
        "/page/delete": { DELETE: withCors((req) => pageHandler.deletePage(req)) },
        "/shape/create": { POST: withCors((req) => shapeHandler.createShape(req)) },
        "/shape/get": { GET: withCors((req) => shapeHandler.getShape(req)) },
        "/shape/page": { GET: withCors((req) => shapeHandler.getShapesByPage(req)) },
        "/shape/session": { GET: withCors((req) => shapeHandler.getShapesBySession(req)) },
        "/shape/update": { PATCH: withCors((req) => shapeHandler.updateShape(req)) },
        "/shape/delete": { DELETE: withCors((req) => shapeHandler.deleteShape(req)) },
        "/shape/sync": { POST: withCors((req) => shapeHandler.syncShapes(req)) },
        "/session/create": { POST: withCors((req) => sessionHandler.createSession(req)) },
        "/session/get": { GET: withCors((req) => sessionHandler.getSession(req)) },
        "/session/key": { GET: withCors((req) => sessionHandler.getSessionByKey(req)) },
        "/session/page": { GET: withCors((req) => sessionHandler.getSessionsByPage(req)) },
        "/session/page/active": { GET: withCors((req) => sessionHandler.getActiveSessionByPage(req)) },
        "/session/update": { PATCH: withCors((req) => sessionHandler.updateSession(req)) },
        "/session/end": { POST: withCors((req) => sessionHandler.endSession(req)) },
        "/session/delete": { DELETE: withCors((req) => sessionHandler.deleteSession(req)) },
        "/ws/:roomId": {
            GET: (req: Bun.BunRequest, server: Bun.Server<WSData>) => {
                const roomId = (req.params as { roomId: string }).roomId;
                const success = server.upgrade(req, {
                    data: { roomId, request: req as unknown as Request },
                });
                if (success) return undefined as unknown as Response;
                return new Response("WebSocket upgrade failed", { status: 400 });
            },
        },
    },
    websocket: {
        message(ws, message) {
            const data =
                message instanceof ArrayBuffer
                    ? new Uint8Array(message)
                    : typeof message === "string"
                        ? new TextEncoder().encode(message)
                        : new Uint8Array(message);
            console.log(`[ws] message — room: ${ws.data.roomId}, bytes: ${data.length}`);
            ws.data.clientConnection?.handleMessage(data);
        },

        open(ws) {
            console.log(`[ws] open — room: ${ws.data.roomId}`);
            const clientConn = hocuspocus.handleConnection(ws, ws.data.request);
            ws.data.clientConnection = clientConn;
        },

        close(ws) {
            console.log(`[ws] close — room: ${ws.data.roomId}`);
            ws.data.clientConnection?.handleClose();
        },
    },
});

console.log(`[board-ws] Hocuspocus WebSocket server running on port ${server.port}`);
