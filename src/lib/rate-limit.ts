/**
 * Lightweight in-memory token-bucket rate limiter.
 *
 * Zero external dependencies — uses the Next.js module cache so the map
 * persists across requests within the same Node.js process/serverless instance.
 *
 * Usage:
 *   const result = rateLimit({ key: ip, limit: 10, windowMs: 60_000 });
 *   if (!result.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
 */

interface BucketEntry {
  count: number;
  resetAt: number; // epoch ms when the window resets
}

// Module-level map — lives for the lifetime of the Node.js process.
const store = new Map<string, BucketEntry>();

// Purge stale entries every 5 minutes to prevent unbounded memory growth.
let lastPurge = Date.now();
const PURGE_INTERVAL_MS = 5 * 60 * 1000;

function purgeExpired() {
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Unique identifier for the caller — typically the client IP. */
  key: string;
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Duration of the sliding window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  purgeExpired();

  const now = Date.now();
  const existing = store.get(key);

  // Start a new window if none exists or the previous one has expired.
  if (!existing || now > existing.resetAt) {
    const entry: BucketEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  // Increment within the current window.
  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const allowed = existing.count <= limit;

  return { allowed, remaining, resetAt: existing.resetAt };
}
