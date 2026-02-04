import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userDid: text('user_did').references(() => users.id).notNull(),
  communityId: text('community_id').references(() => communities.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userCommunityUnique: unique('subscriptions_user_community_unique').on(table.userDid, table.communityId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
