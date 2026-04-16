import { eq, and } from "drizzle-orm";
import type { DbInstance } from "../db";
import { shapes, pages } from "../db/schema";

export interface ShapeRepo {
  findById(id: string): Promise<typeof shapes.$inferSelect | null>;
  findByPageId(pageId: string, includeDeleted?: boolean): Promise<typeof shapes.$inferSelect[]>;
  findBySessionId(sessionId: string): Promise<typeof shapes.$inferSelect[]>;
  create(data: {
    pageId: string;
    props?: Record<string, unknown>;
    sessionId?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<typeof shapes.$inferSelect>;
  update(id: string, data: { props?: Record<string, unknown>; updatedBy?: string }): Promise<typeof shapes.$inferSelect | null>;
  upsert(id: string, data: {
    pageId: string;
    props: Record<string, unknown>;
    sessionId?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<typeof shapes.$inferSelect>;
  delete(id: string): Promise<boolean>;
  hardDelete(id: string): Promise<boolean>;
}

export function initShapeRepo(db: DbInstance): ShapeRepo {
  return {
    async findById(id) {
      const result = await db.query.shapes.findFirst({
        where: eq(shapes.id, id),
      });
      return result ?? null;
    },

    async findByPageId(pageId, includeDeleted = false) {
      if (includeDeleted) {
        return db.query.shapes.findMany({
          where: eq(shapes.page_id, pageId),
        });
      }
      return db.query.shapes.findMany({
        where: and(eq(shapes.page_id, pageId), eq(shapes.isDeleted, false)),
      });
    },

    async findBySessionId(sessionId) {
      return db.query.shapes.findMany({
        where: and(eq(shapes.sessionId, sessionId), eq(shapes.isDeleted, false)),
      });
    },

    async create(data) {
      const [result] = await db
        .insert(shapes)
        .values({
          page_id: data.pageId,
          props: data.props ?? {},
          sessionId: data.sessionId,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        })
        .returning();
      return result!;
    },

    async update(id, data) {
      const [result] = await db
        .update(shapes)
        .set({
          props: data.props,
          updatedBy: data.updatedBy,
        })
        .where(eq(shapes.id, id))
        .returning();
      return result ?? null;
    },

    async upsert(id, data) {
      const existing = await db.query.shapes.findFirst({
        where: eq(shapes.id, id),
      });

      if (existing) {
        const [result] = await db
          .update(shapes)
          .set({
            props: data.props,
            updatedBy: data.updatedBy,
          })
          .where(eq(shapes.id, id))
          .returning();
        return result!;
      }

      const [result] = await db
        .insert(shapes)
        .values({
          id,
          page_id: data.pageId,
          props: data.props,
          sessionId: data.sessionId,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        })
        .returning();
      return result!;
    },

    async delete(id) {
      const [result] = await db
        .update(shapes)
        .set({ isDeleted: true })
        .where(eq(shapes.id, id))
        .returning();
      return !!result;
    },

    async hardDelete(id) {
      const [result] = await db
        .delete(shapes)
        .where(eq(shapes.id, id))
        .returning();
      return !!result;
    },
  };
}
