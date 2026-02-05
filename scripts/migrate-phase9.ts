/**
 * Phase 9 Migration Script
 * Creates moderation-related tables
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config({ path: '.env.local' });

async function migrate() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  const sql = neon(process.env.POSTGRES_URL);

  console.log('Starting Phase 9 migration...\n');

  // Create moderation_actions table
  console.log('Creating moderation_actions table...');
  await sql`
    CREATE TABLE IF NOT EXISTS moderation_actions (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      moderator_did TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL CHECK (action IN (
        'remove_post', 'restore_post', 'pin_post', 'unpin_post', 'lock_post', 'unlock_post',
        'ban_user', 'unban_user', 'mute_user', 'unmute_user',
        'update_rules', 'add_flair', 'remove_flair',
        'add_moderator', 'remove_moderator'
      )),
      target_post_uri TEXT,
      target_user_did TEXT,
      reason TEXT,
      details TEXT,
      duration TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `;
  console.log('✓ moderation_actions table created');

  // Create indexes for moderation_actions
  console.log('Creating moderation_actions indexes...');
  await sql`CREATE INDEX IF NOT EXISTS mod_actions_community_idx ON moderation_actions(community_id)`;
  await sql`CREATE INDEX IF NOT EXISTS mod_actions_moderator_idx ON moderation_actions(moderator_did)`;
  await sql`CREATE INDEX IF NOT EXISTS mod_actions_target_user_idx ON moderation_actions(target_user_did)`;
  await sql`CREATE INDEX IF NOT EXISTS mod_actions_created_idx ON moderation_actions(created_at DESC)`;
  console.log('✓ moderation_actions indexes created');

  // Create community_bans table
  console.log('Creating community_bans table...');
  await sql`
    CREATE TABLE IF NOT EXISTS community_bans (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      user_did TEXT NOT NULL REFERENCES users(id),
      moderator_did TEXT NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL,
      is_permanent BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `;
  console.log('✓ community_bans table created');

  // Create indexes for community_bans
  console.log('Creating community_bans indexes...');
  await sql`CREATE INDEX IF NOT EXISTS community_bans_community_user_idx ON community_bans(community_id, user_did)`;
  await sql`CREATE INDEX IF NOT EXISTS community_bans_expires_idx ON community_bans(expires_at)`;
  console.log('✓ community_bans indexes created');

  // Create community_rules table
  console.log('Creating community_rules table...');
  await sql`
    CREATE TABLE IF NOT EXISTS community_rules (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      order_index TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ community_rules table created');

  // Create indexes for community_rules
  console.log('Creating community_rules indexes...');
  await sql`CREATE INDEX IF NOT EXISTS community_rules_order_idx ON community_rules(community_id, order_index)`;
  console.log('✓ community_rules indexes created');

  // Create post_flairs table
  console.log('Creating post_flairs table...');
  await sql`
    CREATE TABLE IF NOT EXISTS post_flairs (
      id TEXT PRIMARY KEY,
      community_id TEXT NOT NULL REFERENCES communities(id),
      name TEXT NOT NULL,
      color TEXT,
      background_color TEXT,
      is_mod_only BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ post_flairs table created');

  // Create indexes for post_flairs
  console.log('Creating post_flairs indexes...');
  await sql`CREATE INDEX IF NOT EXISTS post_flairs_community_idx ON post_flairs(community_id)`;
  console.log('✓ post_flairs indexes created');

  console.log('\n✅ Phase 9 migration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
