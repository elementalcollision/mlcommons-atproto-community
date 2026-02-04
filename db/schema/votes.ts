import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const votes = pgTable('votes', {
  uri: text('uri').primaryKey(), // at://did/mlcommons.community.vote/rkey
  rkey: text('rkey').notNull(),
  authorDid: text('author_did').references(() => users.did).notNull(),
  subjectUri: text('subject_uri').notNull(), // Post/comment URI
  direction: text('direction', { enum: ['up', 'down'] }).notNull(), // 'up' or 'down'
  createdAt: timestamp('created_at').notNull(),
  indexedAt: timestamp('indexed_at').defaultNow().notNull(),
}, (table) => ({
  subjectIdx: index('votes_subject_idx').on(table.subjectUri),
  authorSubjectUnique: unique('votes_author_subject_unique').on(table.authorDid, table.subjectUri),
}));

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
