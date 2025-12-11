// Simple in-memory rate limiter for edge functions
// Uses a sliding window approach

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 30,  // 30 requests per minute
};

export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 10,  // 10 requests per minute (for sensitive operations)
};

export const HEARTBEAT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 120,  // 2 requests per second max (heartbeat is frequent)
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., user_id or IP)
 * @param config - Rate limit configuration
 * @returns Object with allowed boolean and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up old entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    cleanupOldEntries(config.windowMs);
  }

  if (!entry || (now - entry.windowStart) > config.windowMs) {
    // New window
    rateLimitStore.set(identifier, { count: 1, windowStart: now });
    return { 
      allowed: true, 
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    };
  }

  if (entry.count >= config.maxRequests) {
    const resetIn = config.windowMs - (now - entry.windowStart);
    return { 
      allowed: false, 
      remaining: 0,
      resetIn: Math.max(0, resetIn)
    };
  }

  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count,
    resetIn: config.windowMs - (now - entry.windowStart)
  };
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(
  remaining: number, 
  resetIn: number,
  limit: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil((Date.now() + resetIn) / 1000).toString(),
  };
}

/**
 * Create a rate limited error response
 */
export function rateLimitedResponse(resetIn: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Trop de requêtes. Veuillez réessayer plus tard.',
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(resetIn / 1000).toString(),
      },
    }
  );
}

function cleanupOldEntries(windowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if ((now - entry.windowStart) > windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}
