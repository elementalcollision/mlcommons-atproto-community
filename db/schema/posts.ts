import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

export const posts = pgTable('posts', {
  uri: text('uri').primaryKey(), // ATProto URI: at://did/mlcommons.community.post/rkey
  rkey: text('rkey').notNull(),
  cid: text('cid').notNull(), // Content ID for versioning
  authorDid: text('author_did').references(() => users.did).notNull(),
  communityId: text('community_id').references(() => communities.id).notNull(),
  title: text('title'),
  text: text('text').notNull(),
  embedType: text('embed_type'), // 'images', 'external', 'record', etc.
  embedData: text('embed_data'), // JSON blob
  tags: text('tags').array(), // Post flair/tags
  lang: text('lang'),
  replyParent: text('reply_parent'), // Parent post URI if comment
  replyRoot: text('reply_root'), // Root post URI if nested comment
  voteCount: integer('vote_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  hotScore: integer('hot_score').default(0).notNull(), // For ranking
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

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
