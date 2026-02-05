/**
 * Phase 8 Migration Script
 * Creates notifications, bookmarks, and user_settings tables
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

  console.log('Starting Phase 8 migration...\n');

  // Create notifications table
  console.log('Creating notifications table...');
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK (type IN ('reply', 'mention', 'vote', 'community', 'moderator')),
      actor_id TEXT REFERENCES users(id),
      post_uri TEXT,
      community_id TEXT,
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      read_at TIMESTAMP
    )
  `;
  console.log('✓ notifications table created');

  // Create indexes for notifications
  console.log('Creating notifications indexes...');
  await sql`CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read) WHERE is_read = false`;
  console.log('✓ notifications indexes created');

  // Create bookmarks table
  console.log('Creating bookmarks table...');
  await sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      post_uri TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ bookmarks table created');

  // Create indexes for bookmarks
  console.log('Creating bookmarks indexes...');
  await sql`CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx ON bookmarks(user_id, created_at DESC)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_post_unique ON bookmarks(user_id, post_uri)`;
  console.log('✓ bookmarks indexes created');

  // Create user_settings table
  console.log('Creating user_settings table...');
  await sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
      compact_mode BOOLEAN NOT NULL DEFAULT false,
      email_notifications BOOLEAN NOT NULL DEFAULT true,
      notify_replies BOOLEAN NOT NULL DEFAULT true,
      notify_mentions BOOLEAN NOT NULL DEFAULT true,
      notify_votes BOOLEAN NOT NULL DEFAULT false,
      notify_community_updates BOOLEAN NOT NULL DEFAULT true,
      default_feed TEXT NOT NULL DEFAULT 'all' CHECK (default_feed IN ('all', 'subscribed')),
      default_sort TEXT NOT NULL DEFAULT 'hot' CHECK (default_sort IN ('hot', 'new', 'top', 'trending')),
      show_online_status BOOLEAN NOT NULL DEFAULT true,
      allow_direct_messages BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✓ user_settings table created');

  console.log('\n✅ Phase 8 migration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
