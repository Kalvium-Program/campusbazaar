import { Router } from "express";
import { z } from "zod";
import { draftListing, type Provider } from "../ai.js";
import { requireAuth } from "../auth.js";
import { rateLimit } from "../rateLimit.js";

const body = z.object({
  notes: z.string().trim().min(5, "Write a few words about the item").max(500),
});

export function aiRouter(provider?: Provider) {
  const r = Router();
  // Per user (minute and day) plus one global cap so the free AI quota cannot be drained.
  r.post("/draft", requireAuth, rateLimit(5, 60_000, (req) => String(req.user?.id)), rateLimit(30, 24 * 3600_000, (req) => String(req.user?.id)), rateLimit(100, 60_000, () => "all"), async (req, res) => {
    const input = body.parse(req.body);
    res.json({ draft: await draftListing(input, provider) });
  });
  return r;
}
