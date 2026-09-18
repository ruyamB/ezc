// Tiny in-memory sliding-window rate limiter for API routes.
// (Single-instance safe. For multi-instance deployments put this behind
// Upstash/Vercel KV — the checkRateLimit signature stays the same.)

interface Bucket {
  hits: number[];
}

function store(): Map<string, Bucket> {
  const g = globalThis as unknown as { __ezc_rl?: Map<string, Bucket> };
  if (!g.__ezc_rl) g.__ezc_rl = new Map();
  return g.__ezc_rl;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const buckets = store();
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [] };
    buckets.set(key, b);
  }
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    const oldest = b.hits[0] ?? now;
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000), remaining: 0 };
  }
  b.hits.push(now);
  return { allowed: true, retryAfterSec: 0, remaining: limit - b.hits.length };
}

export const GENERATE_LIMIT = { limit: 10, windowMs: 60_000 }; // 10 AI generations / min / IP
export const PLAN_LIMIT = { limit: 10, windowMs: 60_000 }; // 10 text→blocks plans / min / IP
export const VALIDATE_LIMIT = { limit: 10, windowMs: 60_000 }; // 10 key validations / min / IP
export const COMPILE_LIMIT = { limit: 30, windowMs: 60_000 }; // 30 compiles / min / IP
