import { AIError } from '../errors';

export interface RateLimiter {
  acquire(providerId: string): boolean;
  configure(providerId: string, rpm: number): void;
  getRemainingCapacity(providerId: string): number;
}

interface BucketState {
  rpm: number;
  tokens: number;
  lastRefill: number;
}

export function createRateLimiter(): RateLimiter {
  const buckets = new Map<string, BucketState>();

  function refill(state: BucketState): void {
    const now = Date.now();
    const elapsed = now - state.lastRefill;
    const tokensToAdd = (elapsed / 60_000) * state.rpm;
    state.tokens = Math.min(state.rpm, state.tokens + tokensToAdd);
    state.lastRefill = now;
  }

  return {
    acquire(providerId: string): boolean {
      const state = buckets.get(providerId);
      if (!state) return true;

      refill(state);

      if (state.tokens < 1) {
        return false;
      }

      state.tokens -= 1;
      return true;
    },

    configure(providerId: string, rpm: number): void {
      buckets.set(providerId, {
        rpm,
        tokens: rpm,
        lastRefill: Date.now(),
      });
    },

    getRemainingCapacity(providerId: string): number {
      const state = buckets.get(providerId);
      if (!state) return Infinity;
      refill(state);
      return Math.floor(state.tokens);
    },
  };
}

export function checkRateLimit(rateLimiter: RateLimiter, providerId: string): void {
  if (!rateLimiter.acquire(providerId)) {
    throw AIError.rateLimited(providerId);
  }
}
