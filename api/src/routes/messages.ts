import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { db } from "../db.js";
import { HttpError, notFound } from "../errors.js";
import { rateLimit } from "../rateLimit.js";
import { hub } from "../ws.js";

export const messagesRouter = Router();
const person = { select: { id: true, name: true } } as const;

// Inbox: one row per (listing, other person), newest first.
messagesRouter.get("/conversations", requireAuth, async (req, res) => {
  const me = req.user!.id;
  const rows = await db.message.findMany({
    where: { OR: [{ senderId: me }, { receiverId: me }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { listing: { select: { id: true, title: true } }, sender: person, receiver: person },
  });
  const seen = new Map<string, unknown>();
  for (const m of rows) {
    const other = m.senderId === me ? m.receiver : m.sender;
    const key = `${m.listingId}:${other.id}`;
    if (!seen.has(key)) seen.set(key, { listing: m.listing, with: other, last: { body: m.body, createdAt: m.createdAt, mine: m.senderId === me } });
  }
  res.json({ conversations: [...seen.values()] });
});

const thread = z.object({ with: z.coerce.number().int().positive().optional() });

// Messages for one listing between me and one other person.
// The seller must say who with (?with=ID). A buyer always talks to the owner.
messagesRouter.get("/listings/:id/messages", requireAuth, async (req, res) => {
  const listingId = z.coerce.number().int().positive().parse(req.params.id);
  const { with: withId } = thread.parse(req.query);
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
  if (!listing) throw notFound("Listing");
  const me = req.user!.id;
  const other = me === listing.ownerId ? withId : listing.ownerId;
  if (!other) throw new HttpError(400, "VALIDATION", "Say who you are talking to", { with: "Required for the seller" });
  const messages = await db.message.findMany({
    where: { listingId, OR: [{ senderId: me, receiverId: other }, { senderId: other, receiverId: me }] },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: { sender: person },
  });
  res.json({ messages, otherUserId: other });
});

const sendBody = z.object({ body: z.string().trim().min(1, "Write a message").max(500), to: z.number().int().positive().optional() });

messagesRouter.post(
  "/listings/:id/messages",
  requireAuth,
  rateLimit(30, 60_000, (req) => String(req.user?.id)),
  async (req, res) => {
    const listingId = z.coerce.number().int().positive().parse(req.params.id);
    const body = sendBody.parse(req.body);
    const listing = await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } });
    if (!listing) throw notFound("Listing");
    const me = req.user!.id;
    const to = me === listing.ownerId ? body.to : listing.ownerId;
    if (!to) throw new HttpError(400, "VALIDATION", "Say who the message is for", { to: "Required for the seller" });
    if (to === me) throw new HttpError(400, "VALIDATION", "You cannot message yourself");
    const message = await db.message.create({
      data: { body: body.body, listingId, senderId: me, receiverId: to },
      include: { sender: person },
    });
    hub.sendTo(to, { type: "message", listingId, message });
    res.status(201).json({ message });
  },
);
