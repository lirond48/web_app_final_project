import { NextFunction, Request, Response } from "express";

const WINDOW_MS = 60 * 1000;
const LIMIT_PER_IP = 20;
const buckets = new Map<string, number[]>();

export function searchRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const current = buckets.get(ip) || [];
  const recent = current.filter((ts) => now - ts < WINDOW_MS);

  if (recent.length >= LIMIT_PER_IP) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
    return res.status(429).json({ error: "Too many search requests. Please try again soon." });
  }

  recent.push(now);
  buckets.set(ip, recent);
  return next();
}
