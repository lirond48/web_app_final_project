/**
 * Rate-limit middleware for AI-backed search endpoint.
 *
 * Responsibility:
 * - Protect `/api/search` from excessive requests per IP.
 *
 * Called by:
 * - `routes/searchRoutes.ts`
 *
 * Returns:
 * - `next()` when within quota, otherwise HTTP 429.
 *
 * Must NOT be used by:
 * - Frontend/browser. This is backend middleware only.
 */
import { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60 * 1000;
const LIMIT_PER_IP = 20;
const buckets = new Map<string, number[]>();
const DEBUG_AI = process.env.DEBUG_AI === "true";

/**
 * DEBUG_AI-only logger for rate-limit events.
 *
 * Example:
 * - `debugAiLog("rate-limit blocked", { ip: "127.0.0.1" })`
 */
function debugAiLog(message: string, extra?: Record<string, unknown>): void {
  if (!DEBUG_AI) {
    return;
  }
  if (extra) {
    console.log(`[ai-debug] ${message}`, extra);
    return;
  }
  console.log(`[ai-debug] ${message}`);
}

/**
 * Enforces 20 requests per minute per IP on `/api/search`.
 *
 * Inputs:
 * - Express `req/res/next`.
 *
 * Returns:
 * - Proceeds to next middleware/handler or returns HTTP 429 JSON.
 *
 * Side effects:
 * - Reads/writes in-memory request timestamps map (`buckets`).
 * - Sets `Retry-After` header when blocked.
 *
 * Failure behavior:
 * - No throw; blocks cleanly with status 429.
 *
 * Example:
 * - `router.get("/search", searchRateLimit, searchPosts);`
 */
export function searchRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const current = buckets.get(ip) || [];
  const recent = current.filter((ts) => now - ts < WINDOW_MS);

  if (recent.length >= LIMIT_PER_IP) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
    debugAiLog("rate-limit blocked search request", { ip, limit: LIMIT_PER_IP, windowMs: WINDOW_MS });
    return res.status(429).json({ error: "Too many search requests. Please try again soon." });
  }

  recent.push(now);
  buckets.set(ip, recent);
  return next();
}
