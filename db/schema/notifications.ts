import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Notifications table
 * Stores user notifications for various events:
 * - reply: Someone replied to your post/comment
 * - mention: Someone mentioned you
 * - vote: Your post received votes (batched)
 * - community: Updates from subscribed communities
 */
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').references(() => users.id).notNull(), // Recipient
  type: text('type', {
    enum: ['reply', 'mention', 'vote', 'community', 'moderator']
  }).notNull(),

  // Actor who triggered the notification (optional for system notifications)
  actorId: text('actor_id').references(() => users.id),

  // Reference to the relevant content
  postUri: text('post_uri'), // Related post/comment
  communityId: text('community_id'), // Related community

  // Notification content
  title: text('title').notNull(), // Short title
  body: text('body'), // Optional longer description
  link: text('link'), // URL to navigate to

  // State
  isRead: boolean('is_read').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
}, (table) => ({
  userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
  userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.isRead),
}));

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
