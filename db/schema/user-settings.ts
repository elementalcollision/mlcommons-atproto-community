import { pgTable, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * User Settings table
 * Stores user preferences and settings
 */
export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),

  // Display preferences
  theme: text('theme', { enum: ['light', 'dark', 'system'] }).default('system').notNull(),
  compactMode: boolean('compact_mode').default(false).notNull(),

  // Notification preferences
  emailNotifications: boolean('email_notifications').default(true).notNull(),
  notifyReplies: boolean('notify_replies').default(true).notNull(),
  notifyMentions: boolean('notify_mentions').default(true).notNull(),
  notifyVotes: boolean('notify_votes').default(false).notNull(), // Off by default (can be noisy)
  notifyCommunityUpdates: boolean('notify_community_updates').default(true).notNull(),

  // Feed preferences
  defaultFeed: text('default_feed', { enum: ['all', 'subscribed'] }).default('all').notNull(),
  defaultSort: text('default_sort', { enum: ['hot', 'new', 'top', 'trending'] }).default('hot').notNull(),

  // Privacy
  showOnlineStatus: boolean('show_online_status').default(true).notNull(),
  allowDirectMessages: boolean('allow_direct_messages').default(true).notNull(),

  // Timestamps
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
