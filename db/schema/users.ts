import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID - provider agnostic
  email: text('email').unique(), // Common identifier across providers
  displayName: text('display_name'),
  avatar: text('avatar'),
  bio: text('bio'),
  postKarma: integer('post_karma').default(0).notNull(),
  commentKarma: integer('comment_karma').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
