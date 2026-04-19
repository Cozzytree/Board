import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "../auth-schema";

export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  isLocked: boolean("isLocked").default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("pageId")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  ownerId: text("ownerId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionKey: text("sessionKey").notNull().unique(),
  isActive: boolean("isActive").default(true),
  settings: jsonb("settings").default({}),
  expiresAt: timestamp("expiresAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
});

export const shapes = pgTable("shapes", {
  id: uuid("id").defaultRandom().primaryKey(),
  props: jsonb("props").default({}),
  page_id: uuid("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  isDeleted: boolean("isDeleted").default(false),
  sessionId: uuid("sessionId").references(() => sessions.id, { onDelete: "set null" }),
  createdBy: text("createdBy").references(() => user.id),
  updatedBy: text("updatedBy").references(() => user.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const usersRelations = relations(user, ({ many }) => ({
  pages: many(pages),
  sessions: many(sessions),
  createdShapes: many(shapes, { relationName: "createdBy" }),
  updatedShapes: many(shapes, { relationName: "updatedBy" }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(user, {
    fields: [pages.userId],
    references: [user.id],
  }),
  shapes: many(shapes),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  page: one(pages, {
    fields: [sessions.pageId],
    references: [pages.id],
  }),
  owner: one(user, {
    fields: [sessions.ownerId],
    references: [user.id],
  }),
  shapes: many(shapes),
}));

export const shapesRelations = relations(shapes, ({ one }) => ({
  page: one(pages, {
    fields: [shapes.page_id],
    references: [pages.id],
  }),
  session: one(sessions, {
    fields: [shapes.sessionId],
    references: [sessions.id],
  }),
  creator: one(user, {
    fields: [shapes.createdBy],
    references: [user.id],
    relationName: "createdBy",
  }),
  updater: one(user, {
    fields: [shapes.updatedBy],
    references: [user.id],
    relationName: "updatedBy",
  }),
}));
