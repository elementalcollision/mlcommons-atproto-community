/**
 * Simple In-Memory Cache
 *
 * Provides a TTL-based caching layer for hot data.
 * For production, consider using Redis or Vercel KV.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton cache instance
export const cache = new Cache();

// Cache TTL presets
export const TTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  HOUR: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Cache key generators
export const cacheKeys = {
  community: (name: string) => `community:${name}`,
  communityStats: (id: string) => `community:stats:${id}`,
  trendingCommunities: () => 'trending:communities',
  trendingPosts: (timeFilter: string) => `trending:posts:${timeFilter}`,
  userSubscriptions: (userId: string) => `user:subscriptions:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  postCommentCount: (postUri: string) => `post:comments:${postUri}`,
};

/**
 * Cache wrapper for async functions
 * Automatically caches results with stale-while-revalidate pattern
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const value = await fetcher();

  // Cache the result
  cache.set(key, value, ttlMs);

  return value;
}

/**
 * Invalidate cache entries when data changes
 */
export function invalidateCache(patterns: string[]): void {
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      cache.deletePattern(pattern);
    } else {
      cache.delete(pattern);
    }
  }
}
