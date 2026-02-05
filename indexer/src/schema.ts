/**
 * Database schema for Firehose Indexer
 * Must match the main application's schema exactly
 */

import { pgTable, text, timestamp, integer, boolean, index, unique } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  displayName: text('display_name'),
  avatar: text('avatar'),
  bio: text('bio'),
  postKarma: integer('post_karma').default(0).notNull(),
  commentKarma: integer('comment_karma').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Communities table
export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  creatorDid: text('creator_did').references(() => users.id).notNull(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  banner: text('banner'),
  visibility: text('visibility', { enum: ['public', 'unlisted', 'private'] }).default('public').notNull(),
  postPermissions: text('post_permissions', { enum: ['anyone', 'approved', 'moderators'] }).default('anyone').notNull(),
  atprotoUri: text('atproto_uri'),
  atprotoCid: text('atproto_cid'),
  atprotoRkey: text('atproto_rkey'),
  memberCount: integer('member_count').default(0).notNull(),
  postCount: integer('post_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('communities_name_idx').on(table.name),
  creatorIdx: index('communities_creator_idx').on(table.creatorDid),
}));

// Posts table
export const posts = pgTable('posts', {
  uri: text('uri').primaryKey(),
  rkey: text('rkey').notNull(),
  cid: text('cid').notNull(),
  authorDid: text('author_did').references(() => users.id).notNull(),
  communityId: text('community_id').references(() => communities.id).notNull(),
  title: text('title'),
  text: text('text').notNull(),
  embedType: text('embed_type'),
  embedData: text('embed_data'),
  tags: text('tags').array(),
  lang: text('lang'),
  replyParent: text('reply_parent'),
  replyRoot: text('reply_root'),
  voteCount: integer('vote_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  hotScore: integer('hot_score').default(0).notNull(),
  isRemoved: boolean('is_removed').default(false).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  isLocked: boolean('is_locked').default(false).notNull(),
  createdAt: timestamp('created_at').notNull(),
  indexedAt: timestamp('indexed_at').defaultNow().notNull(),
}, (table) => ({
  communityCreatedIdx: index('posts_community_created_idx').on(table.communityId, table.createdAt),
  communityHotIdx: index('posts_community_hot_idx').on(table.communityId, table.hotScore),
  authorCreatedIdx: index('posts_author_created_idx').on(table.authorDid, table.createdAt),
  replyParentIdx: index('posts_reply_parent_idx').on(table.replyParent),
}));

// Votes table
export const votes = pgTable('votes', {
  uri: text('uri').primaryKey(),
  rkey: text('rkey').notNull(),
  authorDid: text('author_did').references(() => users.id).notNull(),
  subjectUri: text('subject_uri').notNull(),
  direction: text('direction', { enum: ['up', 'down'] }).notNull(),
  createdAt: timestamp('created_at').notNull(),
  indexedAt: timestamp('indexed_at').defaultNow().notNull(),
}, (table) => ({
  subjectIdx: index('votes_subject_idx').on(table.subjectUri),
  authorSubjectUnique: unique('votes_author_subject_unique').on(table.authorDid, table.subjectUri),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Community = typeof communities.$inferSelect;
export type NewCommunity = typeof communities.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
