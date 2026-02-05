/**
 * Rate Limiter
 *
 * In-memory rate limiting for API endpoints.
 * Uses a sliding window algorithm for fair rate limiting.
 *
 * For production, consider using Redis or a distributed cache.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

startCleanup();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is rate limited
 *
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // If no entry or window expired, start fresh
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(key, newEntry);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: newEntry.resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limiter for a specific endpoint
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (key: string) => checkRateLimit(key, options);
}

// Preset rate limiters for common use cases
export const rateLimiters = {
  // General API: 100 requests per minute
  api: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }),

  // Authentication: 10 requests per minute
  auth: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }),

  // Write operations: 30 requests per minute
  write: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }),

  // Search: 20 requests per minute
  search: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 20 }),

  // Strict: 5 requests per minute (for sensitive operations)
  strict: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 5 }),
};

/**
 * Get client identifier from request
 * Uses X-Forwarded-For for proxy environments, falls back to remote address
 */
export function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Get the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  // Fallback to a default identifier
  // In production, you'd want to get the actual remote address
  return 'unknown';
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 0 : 1)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  };
}

/**
 * Check rate limit and throw 429 if exceeded
 */
export function enforceRateLimit(
  request: Request,
  limiter: (key: string) => RateLimitResult,
  keyPrefix = ''
): RateLimitResult {
  const clientId = getClientId(request);
  const key = keyPrefix ? `${keyPrefix}:${clientId}` : clientId;
  const result = limiter(key);

  if (!result.allowed) {
    throw new Response('Too Many Requests', {
      status: 429,
      headers: rateLimitHeaders(result),
    });
  }

  return result;
}
