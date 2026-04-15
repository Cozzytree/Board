import { z } from "zod";
import type { Repos } from "../repo";
import { auth as authInstance } from "../auth";

const createPageSchema = z.object({
  title: z.string().min(1).max(255),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

const idParamSchema = z.object({
  id: z.uuid(),
});

const userIdParamSchema = z.object({
  userId: z.string(),
});

export interface PageHandler {
  createPage(req: Request): Promise<Response>;
  getPage(req: Request): Promise<Response>;
  getPagesByUser(req: Request): Promise<Response>;
  updatePage(req: Request): Promise<Response>;
  deletePage(req: Request): Promise<Response>;
}

export function initPageHandler(repos: Repos, auth: typeof authInstance): PageHandler {
  return {
    async createPage(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const parsed = createPageSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const page = await repos.pages.create({
        userId: session.user.id,
        title: parsed.data.title,
      });
      return Response.json(page, { status: 201 });
    },

    async getPage(req) {
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

      const page = await repos.pages.findById(parsed.data.id);
      if (!page) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      return Response.json(page);
    },

    async getPagesByUser(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const userId = url.searchParams.get("userId");
      const parsed = userIdParamSchema.safeParse({ userId });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const pages = await repos.pages.findByUserId(parsed.data.userId);
      return Response.json(pages);
    },

    async updatePage(req) {
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

      const body = await req.json();
      const bodyParsed = updatePageSchema.safeParse(body);
      if (!bodyParsed.success) {
        return Response.json({ error: bodyParsed.error.flatten() }, { status: 400 });
      }

      const existingPage = await repos.pages.findById(idParsed.data.id);
      if (!existingPage) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      if (existingPage.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const page = await repos.pages.update(idParsed.data.id, bodyParsed.data);
      return Response.json(page);
    },

    async deletePage(req) {
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

      const existingPage = await repos.pages.findById(parsed.data.id);
      if (!existingPage) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      if (existingPage.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      await repos.pages.delete(parsed.data.id);
      return new Response(null, { status: 204 });
    },
  };
}
