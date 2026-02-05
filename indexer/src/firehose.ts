/**
 * ATProto Firehose Connection
 *
 * Connects to the Bluesky Jetstream firehose to receive real-time events.
 * Filters for mlcommons.* collection events only.
 */

import WebSocket from 'ws';

// Jetstream public endpoint
const JETSTREAM_URL = 'wss://jetstream1.us-east.bsky.network/subscribe';

// Our custom collections to filter
const MLCOMMONS_COLLECTIONS = [
  'mlcommons.community.community',
  'mlcommons.community.post',
  'mlcommons.community.vote',
];

export interface FirehoseEvent {
  did: string;
  time_us: number;
  kind: 'commit' | 'identity' | 'account';
  commit?: {
    rev: string;
    operation: 'create' | 'update' | 'delete';
    collection: string;
    rkey: string;
    record?: Record<string, unknown>;
    cid?: string;
  };
}

export type EventHandler = (event: FirehoseEvent) => Promise<void>;

export class FirehoseClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private cursor: number | null = null;
  private eventHandler: EventHandler | null = null;
  private isShuttingDown = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Set the event handler for incoming firehose events
   */
  onEvent(handler: EventHandler): void {
    this.eventHandler = handler;
  }

  /**
   * Connect to the Jetstream firehose
   */
  connect(startCursor?: number): void {
    if (this.isShuttingDown) return;

    // Build connection URL with our collections filter
    const params = new URLSearchParams();

    // Filter to only our collections
    MLCOMMONS_COLLECTIONS.forEach(collection => {
      params.append('wantedCollections', collection);
    });

    // Resume from cursor if provided
    if (startCursor || this.cursor) {
      params.append('cursor', String(startCursor || this.cursor));
    }

    const url = `${JETSTREAM_URL}?${params.toString()}`;
    console.log(`[Firehose] Connecting to: ${url}`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[Firehose] Connected to Jetstream');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', async (data: WebSocket.RawData) => {
      try {
        const event = JSON.parse(data.toString()) as FirehoseEvent;

        // Update cursor for resumption
        if (event.time_us) {
          this.cursor = event.time_us;
        }

        // Only process commit events with mlcommons collections
        if (event.kind === 'commit' && event.commit) {
          const collection = event.commit.collection;

          if (MLCOMMONS_COLLECTIONS.includes(collection)) {
            console.log(
              `[Firehose] ${event.commit.operation.toUpperCase()} ${collection} from ${event.did}`
            );

            if (this.eventHandler) {
              await this.eventHandler(event);
            }
          }
        }
      } catch (error) {
        console.error('[Firehose] Error parsing message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Firehose] Disconnected: ${code} - ${reason}`);

      if (!this.isShuttingDown) {
        this.reconnect();
      }
    });

    this.ws.on('error', (error) => {
      console.error('[Firehose] WebSocket error:', error);
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Firehose] Max reconnection attempts reached');
      process.exit(1);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`[Firehose] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Get current cursor position for persistence
   */
  getCursor(): number | null {
    return this.cursor;
  }

  /**
   * Gracefully shutdown the connection
   */
  shutdown(): void {
    console.log('[Firehose] Shutting down...');
    this.isShuttingDown = true;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Log final cursor for resumption
    if (this.cursor) {
      console.log(`[Firehose] Final cursor: ${this.cursor}`);
    }

    process.exit(0);
  }
}
