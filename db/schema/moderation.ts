import { pgTable, text, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { communities } from './communities';

/**
 * Moderation Actions Log
 * Audit trail of all moderation actions taken
 */
export const moderationActions = pgTable('moderation_actions', {
  id: text('id').primaryKey(), // UUID
  communityId: text('community_id').references(() => communities.id).notNull(),
  moderatorDid: text('moderator_did').references(() => users.id).notNull(),

  // Action details
  action: text('action', {
    enum: ['remove_post', 'restore_post', 'pin_post', 'unpin_post', 'lock_post', 'unlock_post',
           'ban_user', 'unban_user', 'mute_user', 'unmute_user',
           'update_rules', 'add_flair', 'remove_flair',
           'add_moderator', 'remove_moderator']
  }).notNull(),

  // Target references (depending on action type)
  targetPostUri: text('target_post_uri'),
  targetUserDid: text('target_user_did'),

  // Details
  reason: text('reason'), // Reason for the action
  details: text('details'), // JSON blob for additional context
  duration: text('duration'), // For temporary bans: '1d', '7d', '30d', 'permanent'

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // For temporary actions
}, (table) => ({
  communityIdx: index('mod_actions_community_idx').on(table.communityId),
  moderatorIdx: index('mod_actions_moderator_idx').on(table.moderatorDid),
  targetUserIdx: index('mod_actions_target_user_idx').on(table.targetUserDid),
  createdAtIdx: index('mod_actions_created_idx').on(table.createdAt),
}));

/**
 * Community Bans
 * Users banned from participating in a community
 */
export const communityBans = pgTable('community_bans', {
  id: text('id').primaryKey(), // UUID
  communityId: text('community_id').references(() => communities.id).notNull(),
  userDid: text('user_did').references(() => users.id).notNull(),
  moderatorDid: text('moderator_did').references(() => users.id).notNull(),

  // Ban details
  reason: text('reason').notNull(),
  isPermanent: boolean('is_permanent').default(false).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'), // null for permanent bans
}, (table) => ({
  communityUserIdx: index('community_bans_community_user_idx').on(table.communityId, table.userDid),
  expiresAtIdx: index('community_bans_expires_idx').on(table.expiresAt),
}));

/**
 * Community Rules
 * Rules/guidelines for a community
 */
export const communityRules = pgTable('community_rules', {
  id: text('id').primaryKey(), // UUID
  communityId: text('community_id').references(() => communities.id).notNull(),

  // Rule content
  orderIndex: text('order_index').notNull(), // For ordering rules (e.g., "01", "02")
  title: text('title').notNull(),
  description: text('description'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  communityOrderIdx: index('community_rules_order_idx').on(table.communityId, table.orderIndex),
}));

/**
 * Post Flairs
 * Available flairs/tags for posts in a community
 */
export const postFlairs = pgTable('post_flairs', {
  id: text('id').primaryKey(), // UUID
  communityId: text('community_id').references(() => communities.id).notNull(),

  // Flair content
  name: text('name').notNull(),
  color: text('color'), // Hex color code
  backgroundColor: text('background_color'), // Hex color code for background

  // Settings
  isModOnly: boolean('is_mod_only').default(false).notNull(), // Only mods can apply

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  communityIdx: index('post_flairs_community_idx').on(table.communityId),
}));

// Types
export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;
export type CommunityBan = typeof communityBans.$inferSelect;
export type NewCommunityBan = typeof communityBans.$inferInsert;
export type CommunityRule = typeof communityRules.$inferSelect;
export type NewCommunityRule = typeof communityRules.$inferInsert;
export type PostFlair = typeof postFlairs.$inferSelect;
export type NewPostFlair = typeof postFlairs.$inferInsert;
