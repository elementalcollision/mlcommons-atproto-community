/**
 * MLCommons Firehose Indexer
 *
 * Real-time ATProto event indexer for mlcommons.* collections.
 * Connects to Bluesky's Jetstream firehose and syncs events to the database.
 *
 * Environment Variables:
 * - DATABASE_URL: Neon PostgreSQL connection string
 * - CURSOR_FILE: (optional) Path to persist cursor for resumption
 *
 * Usage:
 * - npm run dev   : Development with hot reload
 * - npm run start : Production mode
 */

import * as fs from 'fs';
import { FirehoseClient } from './firehose.js';
import { handleEvent } from './handlers.js';

// Configuration
const CURSOR_FILE = process.env.CURSOR_FILE || '.cursor';
const STATS_INTERVAL = 60_000; // Log stats every 60 seconds

// Stats tracking
let eventsProcessed = 0;
let errorsCount = 0;
let startTime = Date.now();

/**
 * Load cursor from file for resumption
 */
function loadCursor(): number | undefined {
  try {
    if (fs.existsSync(CURSOR_FILE)) {
      const data = fs.readFileSync(CURSOR_FILE, 'utf-8');
      const cursor = parseInt(data.trim(), 10);
      if (!isNaN(cursor)) {
        console.log(`[Indexer] Resuming from cursor: ${cursor}`);
        return cursor;
      }
    }
  } catch (error) {
    console.error('[Indexer] Error loading cursor:', error);
  }
  return undefined;
}

/**
 * Save cursor to file for resumption
 */
function saveCursor(cursor: number | null): void {
  if (cursor) {
    try {
      fs.writeFileSync(CURSOR_FILE, cursor.toString());
    } catch (error) {
      console.error('[Indexer] Error saving cursor:', error);
    }
  }
}

/**
 * Log processing statistics
 */
function logStats(client: FirehoseClient): void {
  const uptime = Math.round((Date.now() - startTime) / 1000);
  const rate = (eventsProcessed / uptime).toFixed(2);

  console.log(
    `[Stats] Events: ${eventsProcessed} | Errors: ${errorsCount} | Rate: ${rate}/s | Uptime: ${uptime}s`
  );

  // Save cursor periodically
  saveCursor(client.getCursor());
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('===========================================');
  console.log('   MLCommons Firehose Indexer');
  console.log('===========================================');
  console.log('');

  // Verify database connection
  if (!process.env.DATABASE_URL) {
    console.error('[Indexer] ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('[Indexer] Database connection configured');

  // Create firehose client
  const client = new FirehoseClient();

  // Set up event handler
  client.onEvent(async (event) => {
    try {
      await handleEvent(event);
      eventsProcessed++;
    } catch (error) {
      errorsCount++;
      console.error('[Indexer] Error handling event:', error);
    }
  });

  // Load saved cursor for resumption
  const cursor = loadCursor();

  // Start stats logging
  setInterval(() => logStats(client), STATS_INTERVAL);

  // Connect to firehose
  console.log('[Indexer] Starting firehose connection...');
  client.connect(cursor);

  console.log('[Indexer] Indexer is running. Press Ctrl+C to stop.');
}

// Run the indexer
main().catch((error) => {
  console.error('[Indexer] Fatal error:', error);
  process.exit(1);
});
