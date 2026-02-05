import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Bookmarks table
 * Stores saved/bookmarked posts for users
 */
export const bookmarks = pgTable('bookmarks', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').references(() => users.id).notNull(),
  postUri: text('post_uri').notNull(), // URI of the saved post

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('bookmarks_user_created_idx').on(table.userId, table.createdAt),
  userPostUnique: unique('bookmarks_user_post_unique').on(table.userId, table.postUri),
}));

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
