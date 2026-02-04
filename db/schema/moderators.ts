import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

export const moderators = pgTable('moderators', {
  id: text('id').primaryKey(),
  communityId: text('community_id').references(() => communities.id).notNull(),
  userDid: text('user_did').references(() => users.id).notNull(),
  role: text('role', { enum: ['moderator', 'admin'] }).default('moderator').notNull(),
  permissions: text('permissions').array(), // Specific permissions
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  communityUserUnique: unique('moderators_community_user_unique').on(table.communityId, table.userDid),
}));

export type Moderator = typeof moderators.$inferSelect;
export type NewModerator = typeof moderators.$inferInsert;
