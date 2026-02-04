import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const communities = pgTable('communities', {
  id: text('id').primaryKey(), // UUID
  rkey: text('rkey').notNull(), // ATProto record key
  creatorDid: text('creator_did').references(() => users.id).notNull(),
  name: text('name').notNull().unique(), // URL-safe name
  displayName: text('display_name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  banner: text('banner'),
  visibility: text('visibility', { enum: ['public', 'unlisted', 'private'] }).default('public').notNull(),
  postPermissions: text('post_permissions', { enum: ['anyone', 'approved', 'moderators'] }).default('anyone').notNull(),
  memberCount: integer('member_count').default(0).notNull(),
  postCount: integer('post_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('communities_name_idx').on(table.name),
  creatorIdx: index('communities_creator_idx').on(table.creatorDid),
}));

export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
