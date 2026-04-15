import { z } from "zod";
import type { Repos } from "../repo";
import { auth as authInstance } from "../auth";

const createShapeSchema = z.object({
  pageId: z.uuid(),
  props: z.record(z.string(), z.unknown()).optional(),
});

const updateShapeSchema = z.object({
  props: z.record(z.string(), z.unknown()).optional(),
});

const idParamSchema = z.object({
  id: z.uuid(),
});

const pageIdParamSchema = z.object({
  pageId: z.uuid(),
});

export interface ShapeHandler {
  createShape(req: Request): Promise<Response>;
  getShape(req: Request): Promise<Response>;
  getShapesByPage(req: Request): Promise<Response>;
  updateShape(req: Request): Promise<Response>;
  deleteShape(req: Request): Promise<Response>;
}

export function initShapeHandler(repos: Repos, auth: typeof authInstance): ShapeHandler {
  return {
    async createShape(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const parsed = createShapeSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const page = await repos.pages.findById(parsed.data.pageId);
      if (!page) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      if (page.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const shape = await repos.shapes.create({
        pageId: parsed.data.pageId,
        props: parsed.data.props,
      });
      return Response.json(shape, { status: 201 });
    },

    async getShape(req) {
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

      const shape = await repos.shapes.findById(parsed.data.id);
      if (!shape) {
        return Response.json({ error: "Shape not found" }, { status: 404 });
      }
      return Response.json(shape);
    },

    async getShapesByPage(req) {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(req.url);
      const pageId = url.searchParams.get("pageId");
      const parsed = pageIdParamSchema.safeParse({ pageId });
      if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
      }

      const page = await repos.pages.findById(parsed.data.pageId);
      if (!page) {
        return Response.json({ error: "Page not found" }, { status: 404 });
      }
      if (page.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const shapes = await repos.shapes.findByPageId(parsed.data.pageId);
      return Response.json(shapes);
    },

    async updateShape(req) {
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
      const bodyParsed = updateShapeSchema.safeParse(body);
      if (!bodyParsed.success) {
        return Response.json({ error: bodyParsed.error.flatten() }, { status: 400 });
      }

      const existingShape = await repos.shapes.findById(idParsed.data.id);
      if (!existingShape) {
        return Response.json({ error: "Shape not found" }, { status: 404 });
      }

      const page = await repos.pages.findById(existingShape.page_id);
      if (!page || page.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const shape = await repos.shapes.update(idParsed.data.id, bodyParsed.data);
      return Response.json(shape);
    },

    async deleteShape(req) {
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

      const existingShape = await repos.shapes.findById(parsed.data.id);
      if (!existingShape) {
        return Response.json({ error: "Shape not found" }, { status: 404 });
      }

      const page = await repos.pages.findById(existingShape.page_id);
      if (!page || page.userId !== session.user.id) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      await repos.shapes.delete(parsed.data.id);
      return new Response(null, { status: 204 });
    },
  };
}
