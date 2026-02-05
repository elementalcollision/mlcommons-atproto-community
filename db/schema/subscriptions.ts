import { pgTable, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userDid: text('user_did').references(() => users.id).notNull(),
  communityId: text('community_id').references(() => communities.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCommunityUnique: unique('subscriptions_user_community_unique').on(table.userDid, table.communityId),
  userIdx: index('subscriptions_user_idx').on(table.userDid), // For getting user's subscriptions
  communityIdx: index('subscriptions_community_idx').on(table.communityId), // For counting community members
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
