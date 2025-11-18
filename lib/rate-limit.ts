/**
 * Simple in-memory rate limiter using token bucket algorithm
 * For production, use Redis/KV for distributed rate limiting
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxTokens: number // Maximum tokens in bucket
  refillRate: number // Tokens per second
  cost?: number // Cost per request (default: 1)
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      cost: 1,
      ...config,
    }
  }

  /**
   * Check if request is allowed
   * Returns true if allowed, false if rate limited
   */
  async check(identifier: string): Promise<boolean> {
    const now = Date.now() / 1000 // seconds
    const cost = this.config.cost || 1

    let entry = rateLimitStore.get(identifier)

    if (!entry) {
      // First request
      entry = {
        tokens: this.config.maxTokens - cost,
        lastRefill: now,
      }
      rateLimitStore.set(identifier, entry)
      return true
    }

    // Calculate tokens to add based on time passed
    const timePassed = now - entry.lastRefill
    const tokensToAdd = timePassed * this.config.refillRate
    const newTokens = Math.min(
      this.config.maxTokens,
      entry.tokens + tokensToAdd
    )

    if (newTokens >= cost) {
      // Allow request
      entry.tokens = newTokens - cost
      entry.lastRefill = now
      rateLimitStore.set(identifier, entry)
      return true
    }

    // Rate limited
    return false
  }

  /**
   * Get remaining tokens for identifier
   */
  async getRemaining(identifier: string): Promise<number> {
    const entry = rateLimitStore.get(identifier)
    if (!entry) return this.config.maxTokens

    const now = Date.now() / 1000
    const timePassed = now - entry.lastRefill
    const tokensToAdd = timePassed * this.config.refillRate
    const tokens = Math.min(this.config.maxTokens, entry.tokens + tokensToAdd)

    return Math.floor(tokens)
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    rateLimitStore.delete(identifier)
  }
}

// Cleanup old entries periodically (every 10 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now() / 1000
    const maxAge = 3600 // 1 hour

    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastRefill > maxAge) {
        rateLimitStore.delete(key)
      }
    }
  }, 600000) // 10 minutes
}

// Pre-configured rate limiters
export const authRateLimiter = new RateLimiter({
  maxTokens: 5, // 5 attempts
  refillRate: 1 / 60, // 1 token per minute
})

export const tjkApiRateLimiter = new RateLimiter({
  maxTokens: 10, // 10 requests
  refillRate: 1 / 6, // 1 token per 6 seconds (10 per minute)
})

export const apiRateLimiter = new RateLimiter({
  maxTokens: 100, // 100 requests
  refillRate: 1, // 1 token per second (60 per minute)
})

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return ip
}




