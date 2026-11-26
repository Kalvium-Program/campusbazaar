import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../auth.js";
import { db } from "../db.js";
import { rateLimit } from "../rateLimit.js";
import { forbidden, HttpError, notFound } from "../errors.js";
import type { Prisma } from "../generated/prisma/client.js";

export const listingsRouter = Router();

const CATEGORIES = ["BOOKS", "ELECTRONICS", "FURNITURE", "CYCLES", "CLOTHING", "OTHER"] as const;
const CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const listingBody = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(80),
  description: z.string().trim().min(10, "Describe the item in at least 10 characters").max(600),
  priceRupees: z.coerce.number().int("Whole rupees only").min(1, "Price must be at least 1").max(500000),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
});

const listQuery = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.enum(CATEGORIES).optional(),
  status: z.enum(["AVAILABLE", "SOLD"]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  mine: z.enum(["true", "false"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

// Never send the image bytes in JSON. The page loads them from /listings/:id/image.
const select = {
  id: true, title: true, description: true, priceRupees: true, category: true, condition: true,
  status: true, createdAt: true, imageType: true, views: true,
  _count: { select: { favorites: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.ListingSelect;

type Row = Prisma.ListingGetPayload<{ select: typeof select }>;
const shape = ({ imageType, _count, ...rest }: Row) => ({ ...rest, hasImage: Boolean(imageType), saves: _count.favorites });

// My saved listings (newest save first).
listingsRouter.get("/saved/mine", requireAuth, async (req, res) => {
  const rows = await db.favorite.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 100, select: { listing: { select } } });
  res.json({ items: rows.map((r) => shape(r.listing)) });
});

listingsRouter.get("/", async (req, res) => {
  const q = listQuery.parse(req.query);
  const where: Prisma.ListingWhereInput = {
    ...(q.category && { category: q.category }),
    ...(q.status ? { status: q.status } : {}),
    ...(q.q && { OR: [{ title: { contains: q.q, mode: "insensitive" } }, { description: { contains: q.q, mode: "insensitive" } }] }),
    ...((q.minPrice !== undefined || q.maxPrice !== undefined) && {
      priceRupees: { ...(q.minPrice !== undefined && { gte: q.minPrice }), ...(q.maxPrice !== undefined && { lte: q.maxPrice }) },
    }),
    ...(q.mine === "true" && req.user && { ownerId: req.user.id }),
  };
  if (q.mine === "true" && !req.user) throw new HttpError(401, "UNAUTHORIZED", "Please log in");
  const orderBy: Prisma.ListingOrderByWithRelationInput =
    q.sort === "price_asc" ? { priceRupees: "asc" } : q.sort === "price_desc" ? { priceRupees: "desc" } : q.sort === "popular" ? { views: "desc" } : { createdAt: "desc" };

  const [total, rows] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({ where, orderBy: [orderBy, { id: "desc" }], skip: (q.page - 1) * q.limit, take: q.limit, select }),
  ]);
  res.json({ items: rows.map(shape), page: q.page, limit: q.limit, total, totalPages: Math.max(1, Math.ceil(total / q.limit)) });
});

listingsRouter.get("/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const row = await db.listing.findUnique({ where: { id }, select });
  if (!row) throw notFound("Listing");
  // Count a view unless the seller is looking at their own listing.
  if (req.user?.id !== row.owner.id) {
    await db.listing.update({ where: { id }, data: { views: { increment: 1 } }, select: { id: true } }).catch(() => {});
    row.views += 1;
  }
  res.json({ listing: shape(row) });
});

// More from the same category, close in price.
listingsRouter.get("/:id/similar", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const base = await db.listing.findUnique({ where: { id }, select: { category: true, priceRupees: true } });
  if (!base) throw notFound("Listing");
  const rows = await db.listing.findMany({
    where: { id: { not: id }, status: "AVAILABLE", category: base.category },
    orderBy: { createdAt: "desc" },
    take: 30,
    select,
  });
  rows.sort((a, b) => Math.abs(a.priceRupees - base.priceRupees) - Math.abs(b.priceRupees - base.priceRupees));
  res.json({ items: rows.slice(0, 4).map(shape) });
});

// Save or unsave a listing. Both are safe to repeat.
listingsRouter.put("/:id/favorite", requireAuth, async (req, res) => {
  const listingId = z.coerce.number().int().positive().parse(req.params.id);
  if (!(await db.listing.findUnique({ where: { id: listingId }, select: { id: true } }))) throw notFound("Listing");
  await db.favorite.upsert({ where: { userId_listingId: { userId: req.user!.id, listingId } }, create: { userId: req.user!.id, listingId }, update: {} });
  res.status(204).end();
});
listingsRouter.delete("/:id/favorite", requireAuth, async (req, res) => {
  const listingId = z.coerce.number().int().positive().parse(req.params.id);
  await db.favorite.deleteMany({ where: { userId: req.user!.id, listingId } });
  res.status(204).end();
});

listingsRouter.get("/:id/image", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const row = await db.listing.findUnique({ where: { id }, select: { imageData: true, imageType: true } });
  if (!row?.imageData || !row.imageType) throw notFound("Image");
  res
    .set({
      "Content-Type": row.imageType,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "Cross-Origin-Resource-Policy": "cross-origin",
    })
    .send(Buffer.from(row.imageData));
});

function readImage(file: Express.Multer.File | undefined) {
  if (!file) return {};
  if (!IMAGE_TYPES.has(file.mimetype)) throw new HttpError(400, "BAD_IMAGE", "Photo must be a JPG, PNG or WebP image", { photo: "Use JPG, PNG or WebP" });
  return { imageData: new Uint8Array(file.buffer), imageType: file.mimetype };
}

listingsRouter.post("/", requireAuth, rateLimit(10, 3600_000, (req) => String(req.user?.id)), upload.single("photo"), async (req, res) => {
  const data = listingBody.parse(req.body);
  const row = await db.listing.create({ data: { ...data, ...readImage(req.file), ownerId: req.user!.id }, select });
  res.status(201).json({ listing: shape(row) });
});

// Owner (or admin) only. Someone else's listing looks like it does not exist.
async function ownedListing(id: number, user: NonNullable<Express.Request["user"]>) {
  const row = await db.listing.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!row) throw notFound("Listing");
  if (row.ownerId !== user.id && user.role !== "ADMIN") throw notFound("Listing");
  return row;
}

listingsRouter.patch("/:id", requireAuth, upload.single("photo"), async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  await ownedListing(id, req.user!);
  const data = listingBody.partial().extend({ status: z.enum(["AVAILABLE", "SOLD"]).optional() }).parse(req.body);
  const row = await db.listing.update({ where: { id }, data: { ...data, ...readImage(req.file) }, select });
  res.json({ listing: shape(row) });
});

listingsRouter.delete("/:id", requireAuth, async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  await ownedListing(id, req.user!);
  await db.listing.delete({ where: { id } });
  res.status(204).end();
});

export { forbidden };
