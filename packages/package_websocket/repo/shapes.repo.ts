import { eq } from "drizzle-orm";
import type { DbInstance } from "../db";
import { shapes, pages } from "../db/schema";

export interface ShapeRepo {
  findById(id: string): Promise<typeof shapes.$inferSelect | null>;
  findByPageId(pageId: string): Promise<typeof shapes.$inferSelect[]>;
  create(data: { pageId: string; props?: Record<string, unknown> }): Promise<typeof shapes.$inferSelect>;
  update(id: string, data: { props?: Record<string, unknown> }): Promise<typeof shapes.$inferSelect | null>;
  delete(id: string): Promise<boolean>;
}

export function initShapeRepo(db: DbInstance): ShapeRepo {
  return {
    async findById(id) {
      const result = await db.query.shapes.findFirst({
        where: eq(shapes.id, id),
      });
      return result ?? null;
    },

    async findByPageId(pageId) {
      return db.query.shapes.findMany({
        where: eq(shapes.page_id, pageId),
      });
    },

    async create(data) {
      const [result] = await db
        .insert(shapes)
        .values({ page_id: data.pageId, props: data.props ?? {} })
        .returning();
      return result!;
    },

    async update(id, data) {
      const [result] = await db
        .update(shapes)
        .set(data)
        .where(eq(shapes.id, id))
        .returning();
      return result ?? null;
    },

    async delete(id) {
      const [result] = await db
        .delete(shapes)
        .where(eq(shapes.id, id))
        .returning();
      return !!result;
    },
  };
}
