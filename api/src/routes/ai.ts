import { Router } from "express";
import { z } from "zod";
import { draftListing, type Provider } from "../ai.js";
import { requireAuth } from "../auth.js";
import { rateLimit } from "../rateLimit.js";

const body = z.object({
  notes: z.string().trim().min(5, "Write a few words about the item").max(500),
  category: z.string().optional(),
});

export function aiRouter(provider?: Provider) {
  const r = Router();
  r.post("/draft", requireAuth, rateLimit(10, 60_000, (req) => String(req.user?.id)), async (req, res) => {
    const input = body.parse(req.body);
    res.json({ draft: await draftListing(input, provider) });
  });
  return r;
}
