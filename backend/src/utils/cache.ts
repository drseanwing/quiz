/**
 * @file        Cache Utility
 * @module      Utils/Cache
 * @description Simple in-memory cache with TTL expiry
 */

export interface ICacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache<T> {
  private store = new Map<string, ICacheEntry<T>>();

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds
   */
  set(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Delete all keys matching a pattern (simple prefix match)
   * @param pattern Prefix pattern to match
   */
  deletePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Remove expired entries from the cache
   */
  prune(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Get the number of entries in the cache (including expired)
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Helper function to generate cache keys with parameters
 */
export function buildCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort();
  const parts = sortedKeys.map(k => `${k}:${JSON.stringify(params[k])}`);
  return `${prefix}:${parts.join(':')}`;
}
