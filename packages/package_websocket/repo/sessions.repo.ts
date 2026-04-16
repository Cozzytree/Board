import { eq, and } from "drizzle-orm";
import type { DbInstance } from "../db";
import { sessions } from "../db/schema";
import type { sessions as SessionsTable } from "../db/schema";

export interface SessionRepo {
  findById(id: string): Promise<typeof SessionsTable.$inferSelect | null>;
  findBySessionKey(sessionKey: string): Promise<typeof SessionsTable.$inferSelect | null>;
  findByPageId(pageId: string): Promise<typeof SessionsTable.$inferSelect[]>;
  findActiveByPageId(pageId: string): Promise<typeof SessionsTable.$inferSelect | null>;
  findByOwnerId(ownerId: string): Promise<typeof SessionsTable.$inferSelect[]>;
  create(data: {
    pageId: string;
    ownerId: string;
    sessionKey: string;
    settings?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<typeof SessionsTable.$inferSelect>;
  update(id: string, data: {
    isActive?: boolean;
    settings?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<typeof SessionsTable.$inferSelect | null>;
  end(id: string): Promise<typeof SessionsTable.$inferSelect | null>;
  delete(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}

export function initSessionRepo(db: DbInstance): SessionRepo {
  return {
    async findById(id) {
      const result = await db.query.sessions.findFirst({
        where: eq(sessions.id, id),
      });
      return result ?? null;
    },

    async findBySessionKey(sessionKey) {
      const result = await db.query.sessions.findFirst({
        where: eq(sessions.sessionKey, sessionKey),
      });
      return result ?? null;
    },

    async findByPageId(pageId) {
      return db.query.sessions.findMany({
        where: eq(sessions.pageId, pageId),
      });
    },

    async findActiveByPageId(pageId) {
      const result = await db.query.sessions.findFirst({
        where: and(eq(sessions.pageId, pageId), eq(sessions.isActive, true)),
      });
      return result ?? null;
    },

    async findByOwnerId(ownerId) {
      return db.query.sessions.findMany({
        where: eq(sessions.ownerId, ownerId),
      });
    },

    async create(data) {
      const [result] = await db
        .insert(sessions)
        .values({
          pageId: data.pageId,
          ownerId: data.ownerId,
          sessionKey: data.sessionKey,
          settings: data.settings ?? {},
          expiresAt: data.expiresAt,
        })
        .returning();
      return result!;
    },

    async update(id, data) {
      const [result] = await db
        .update(sessions)
        .set(data)
        .where(eq(sessions.id, id))
        .returning();
      return result ?? null;
    },

    async end(id) {
      const [result] = await db
        .update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.id, id))
        .returning();
      return result ?? null;
    },

    async delete(id) {
      const [result] = await db
        .delete(sessions)
        .where(eq(sessions.id, id))
        .returning();
      return !!result;
    },

    async deleteExpired() {
      const now = new Date();
      const result = await db
        .delete(sessions)
        .where(
          and(
            eq(sessions.isActive, true),
          )
        )
        .returning();
      
      // Delete sessions where expiresAt is in the past
      const expired = result.filter(s => s.expiresAt && s.expiresAt < now);
      for (const session of expired) {
        await db
          .delete(sessions)
          .where(eq(sessions.id, session.id));
      }
      return expired.length;
    },
  };
}
