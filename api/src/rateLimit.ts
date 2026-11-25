import type { Request, RequestHandler } from "express";
import { config } from "./config.js";
import { HttpError } from "./errors.js";

// Small in-memory fixed-window limiter. Fine for one free instance.
export function rateLimit(max: number, windowMs: number, key: (req: Request) => string): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  // Drop expired entries so the map cannot grow forever under heavy traffic.
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    if (config.NODE_ENV === "test") return next();
    const now = Date.now();
    const k = key(req);
    const entry = hits.get(k);
    if (!entry || entry.resetAt < now) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return next(new HttpError(429, "RATE_LIMITED", "Too many requests. Please wait a bit and try again."));
    }
    next();
  };
}

// Behind Vercel and Render, req.ip can be a shared proxy address. Use the first
// X-Forwarded-For entry (the visitor) so one student cannot lock out everyone.
export const clientIp = (req: Request) => req.header("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "unknown";
