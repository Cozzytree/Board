import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "../auth-schema";

export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const shapes = pgTable("shapes", {
  id: uuid("id").defaultRandom().primaryKey(),
  props: jsonb("props").default({}),
  page_id: uuid("page_id")
    .notNull()
    .references(() => pages.id),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const usersRelations = relations(user, ({ many }) => ({
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(user, {
    fields: [pages.userId],
    references: [user.id],
  }),
  shapes: many(shapes),
}));

export const shapesRelations = relations(shapes, ({ one }) => ({
  page: one(pages, {
    fields: [shapes.page_id],
    references: [pages.id],
  }),
}));
