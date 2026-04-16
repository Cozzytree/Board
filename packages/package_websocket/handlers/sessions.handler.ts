import { z } from "zod";
import type { Repos } from "../repo";
import { auth as authInstance } from "../auth";

const createSessionSchema = z.object({
  pageId: z.uuid(),
  settings: z.record(z.string(), z.unknown()).optional(),
  expiresInMinutes: z.number().int().positive().optional(),
});

const updateSessionSchema = z.object({
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const idParamSchema = z.object({
  id: z.uuid(),
});

const sessionKeyParamSchema = z.object({
  sessionKey: z.string(),
});

function generateSessionKey(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export interface SessionHandler {
  createSession(req: Request): Promise<Response>;
  getSession(req: Request): Promise<Response>;
  getSessionByKey(req: Request): Promise<Response>;
  getSessionsByPage(req: Request): Promise<Response>;
  getActiveSessionByPage(req: Request): Promise<Response>;
  updateSession(req: Request): Promise<Response>;
  endSession(req: Request): Promise<Response>;
  deleteSession(req: Request): Promise<Response>;
}

export function initSessionHandler(repos: Repos, auth: typeof authInstance): SessionHandler {
  return {
    async createSession(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const parsed = createSessionSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const page = await repos.pages.findById(parsed.data.pageId);
      if (!page) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      if (page.userId !== session.user.id) {
        return Response.json({ error: "Only page owner can create sessions" }, { status: 403 });
      }

      const existingActive = await repos.sessions.findActiveByPageId(parsed.data.pageId);
      if (existingActive) {
        return Response.json({ error: "An active session already exists for this page" }, { status: 409 });
      }

      const expiresAt = parsed.data.expiresInMinutes
        ? new Date(Date.now() + parsed.data.expiresInMinutes * 60 * 1000)
        : new Date(Date.now() + 60 * 60 * 1000); // Default 1 hour

      const newSession = await repos.sessions.create({
        pageId: parsed.data.pageId,
        ownerId: session.user.id,
        sessionKey: generateSessionKey(),
        settings: parsed.data.settings ?? {},
        expiresAt,
      });

      // Lock the page
      await repos.pages.update(parsed.data.pageId, { isLocked: true });

      return Response.json(newSession, { status: 201 });
    },

    async getSession(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const parsed = idParamSchema.safeParse({ id });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const foundSession = await repos.sessions.findById(parsed.data.id);
      if (!foundSession) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      return Response.json(foundSession);
    },

    async getSessionByKey(req) {
      const url = new URL(req.url);
      const sessionKey = url.searchParams.get("sessionKey");
      const parsed = sessionKeyParamSchema.safeParse({ sessionKey });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const foundSession = await repos.sessions.findBySessionKey(parsed.data.sessionKey);
      if (!foundSession) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      if (!foundSession.isActive) {
        return Response.json({ error: "Session has ended" }, { status: 410 });
      }

      if (foundSession.expiresAt && foundSession.expiresAt < new Date()) {
        return Response.json({ error: "Session has expired" }, { status: 410 });
      }

      return Response.json(foundSession);
    },

    async getSessionsByPage(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const pageId = url.searchParams.get("pageId");
      const parsed = z.object({ pageId: z.string().uuid() }).safeParse({ pageId });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const pageSessions = await repos.sessions.findByPageId(parsed.data.pageId);
      return Response.json(pageSessions);
    },

    async getActiveSessionByPage(req) {
      const url = new URL(req.url);
      const pageId = url.searchParams.get("pageId");
      const parsed = z.object({ pageId: z.string().uuid() }).safeParse({ pageId });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const activeSession = await repos.sessions.findActiveByPageId(parsed.data.pageId);
      if (!activeSession) {
        return Response.json({ error: "No active session" }, { status: 404 });
      }

      return Response.json(activeSession);
    },

    async updateSession(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const idParsed = idParamSchema.safeParse({ id });
      if (!idParsed.success) {
        return Response.json({ error: idParsed.error.flatten() }, { status: 400 });
      }

      const existingSession = await repos.sessions.findById(idParsed.data.id);
      if (!existingSession) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      if (existingSession.ownerId !== session.user.id) {
        return Response.json({ error: "Only session owner can update" }, { status: 403 });
      }

      const body = await req.json();
      const bodyParsed = updateSessionSchema.safeParse(body);
      if (!bodyParsed.success) {
        return Response.json({ error: bodyParsed.error.flatten() }, { status: 400 });
      }

      const updateData: { isActive?: boolean; settings?: Record<string, unknown>; expiresAt?: Date } = {};
      if (bodyParsed.data.isActive !== undefined) {
        updateData.isActive = bodyParsed.data.isActive;
      }
      if (bodyParsed.data.settings !== undefined) {
        updateData.settings = bodyParsed.data.settings;
      }
      if (bodyParsed.data.expiresAt !== undefined) {
        updateData.expiresAt = new Date(bodyParsed.data.expiresAt);
      }

      const updatedSession = await repos.sessions.update(idParsed.data.id, updateData);

      // If session is being deactivated, unlock the page
      if (bodyParsed.data.isActive === false) {
        await repos.pages.update(existingSession.pageId, { isLocked: false });
      }

      return Response.json(updatedSession);
    },

    async endSession(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const parsed = idParamSchema.safeParse({ id });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const existingSession = await repos.sessions.findById(parsed.data.id);
      if (!existingSession) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      if (existingSession.ownerId !== session.user.id) {
        return Response.json({ error: "Only session owner can end session" }, { status: 403 });
      }

      const endedSession = await repos.sessions.end(parsed.data.id);

      // Unlock the page
      await repos.pages.update(existingSession.pageId, { isLocked: false });

      return Response.json(endedSession);
    },

    async deleteSession(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const parsed = idParamSchema.safeParse({ id });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const existingSession = await repos.sessions.findById(parsed.data.id);
      if (!existingSession) {
        return Response.json({ error: "Session not found" }, { status: 404 });
      }
      if (existingSession.ownerId !== session.user.id) {
        return Response.json({ error: "Only session owner can delete" }, { status: 403 });
      }

      // Unlock the page if session was active
      if (existingSession.isActive) {
        await repos.pages.update(existingSession.pageId, { isLocked: false });
      }

      await repos.sessions.delete(parsed.data.id);
      return new Response(null, { status: 204 });
    },
  };
}
