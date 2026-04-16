import { eq } from "drizzle-orm";
import type { DbInstance } from "../db";
import { pages } from "../db/schema";
import type { pages as PagesTable } from "../db/schema";

export interface PageRepo {
  findById(id: string): Promise<typeof PagesTable.$inferSelect | null>;
  findByUserId(userId: string): Promise<typeof PagesTable.$inferSelect[]>;
  create(data: { userId: string; title: string }): Promise<typeof PagesTable.$inferSelect>;
  update(id: string, data: { title?: string; isLocked?: boolean }): Promise<typeof PagesTable.$inferSelect | null>;
  delete(id: string): Promise<boolean>;
}

export function initPageRepo(db: DbInstance): PageRepo {
  return {
    async findById(id) {
      const result = await db.query.pages.findFirst({
        where: eq(pages.id, id),
      });
      return result ?? null;
    },

    async findByUserId(userId) {
      return db.query.pages.findMany({
        where: eq(pages.userId, userId),
      });
    },

    async create(data) {
      const [result] = await db
        .insert(pages)
        .values({ userId: data.userId, title: data.title })
        .returning();
      return result!;
    },

    async update(id, data) {
      const [result] = await db
        .update(pages)
        .set(data)
        .where(eq(pages.id, id))
        .returning();
      return result ?? null;
    },

    async delete(id) {
      const [result] = await db
        .delete(pages)
        .where(eq(pages.id, id))
        .returning();
      return !!result;
    },
  };
}
