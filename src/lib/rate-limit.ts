// Best-effort in-memory sliding-window limiter, used to blunt anonymous surface-scan abuse
// (each scan makes outbound fetches, so it's a cost/DoS vector).
//
// Caveat: in a multi-instance / serverless deploy each instance has its own memory, so this
// is a SOFT guard. Back it with a shared store (Upstash, Supabase) for a hard limit. It is
// genuinely effective in dev and single-instance deployments.

const buckets = new Map<string, number[]>();

/** Returns true if the request is allowed, false if it should be rejected (429). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Extracts a best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
