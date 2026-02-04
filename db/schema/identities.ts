import { pgTable, text, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const identities = pgTable('identities', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // 'atproto', 'google-saml', 'microsoft-entra'
  providerUserId: text('provider_user_id').notNull(), // DID for ATProto, email for SAML, etc.
  email: text('email'), // Email from this provider (if available)
  handle: text('handle'), // Handle (ATProto) or username
  displayName: text('display_name'),
  avatar: text('avatar'),
  rawData: jsonb('raw_data'), // Full provider response for future use
  linkedAt: timestamp('linked_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
}, (table) => ({
  // One identity per provider per user
  userProviderUnique: unique('identities_user_provider_unique').on(table.userId, table.provider),
  // Unique provider identity (prevent duplicate registrations)
  providerUserIdUnique: unique('identities_provider_user_id_unique').on(table.provider, table.providerUserId),
  // Index for lookups
  userIdIdx: index('identities_user_id_idx').on(table.userId),
  providerIdx: index('identities_provider_idx').on(table.provider),
}));

export type Identity = typeof identities.$inferSelect;
export type NewIdentity = typeof identities.$inferInsert;
