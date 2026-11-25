import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client.js";

try {
  process.loadEnvFile(".env");
} catch {
  /* no file: use the real environment (CI) */
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Same data for everyone: a demo that looks the same on every machine.
// The seed users are sample sellers, not logins. Nobody gets their password:
// it is random unless SEED_PASSWORD is set (CI and local tests set it).
import { randomBytes } from "node:crypto";
const PASSWORD = process.env.SEED_PASSWORD ?? randomBytes(24).toString("hex");
const users = [
  { name: "Aarav Mehta", email: "aarav@campus.test", role: "USER" as const },
  { name: "Diya Nair", email: "diya@campus.test", role: "USER" as const },
  { name: "Admin", email: "admin@campus.test", role: "ADMIN" as const },
];

type Seed = [string, string, number, "BOOKS" | "ELECTRONICS" | "FURNITURE" | "CYCLES" | "CLOTHING" | "OTHER", "NEW" | "LIKE_NEW" | "GOOD" | "FAIR", 0 | 1, ("AVAILABLE" | "SOLD")?];
const listings: Seed[] = [
  ["Engineering Mathematics (Kreyszig), 10th ed", "Clean copy, no highlights. Used for first-year maths. Pick up near the library.", 450, "BOOKS", "GOOD", 0],
  ["Operating System Concepts (Silberschatz)", "9th edition, a few pencil notes in chapters 3 and 4. Cover is a little worn.", 380, "BOOKS", "FAIR", 0],
  ["Introduction to Algorithms (CLRS)", "Hardcover, like new. Bought for the algorithms course and barely opened.", 900, "BOOKS", "LIKE_NEW", 0],
  ["Casio fx-991EX scientific calculator", "Works perfectly. Includes the cover. Allowed in all internal exams.", 650, "ELECTRONICS", "GOOD", 1],
  ["boAt Rockerz 450 wireless headphones", "Battery lasts about 12 hours. Small scuff on the left ear cup.", 700, "ELECTRONICS", "GOOD", 1],
  ["Logitech wireless mouse", "Reliable mouse with USB receiver. Used for one year.", 350, "ELECTRONICS", "GOOD", 0],
  ["Raspberry Pi 4 (4GB) with case", "Great for IoT projects. Comes with a 32GB card and power adapter.", 3200, "ELECTRONICS", "LIKE_NEW", 1],
  ["Study table with drawer", "Sturdy wooden table, 4 feet wide. Buyer arranges pickup from the hostel.", 1500, "FURNITURE", "GOOD", 0],
  ["Foldable study chair", "Comfortable, adjustable back. Moving out, so selling cheap.", 600, "FURNITURE", "FAIR", 0],
  ["LED desk lamp, rechargeable", "Three brightness levels. Charges over USB. Works for about 6 hours.", 400, "FURNITURE", "LIKE_NEW", 1],
  ["Hero Sprint 21-speed cycle", "Gears serviced last month. New tyres. Lock included.", 4200, "CYCLES", "GOOD", 1],
  ["Kids-size cycle, good for campus rides", "Small frame, suits a shorter rider. Brakes work well.", 1800, "CYCLES", "FAIR", 0],
  ["Plain black hoodie (size M)", "Worn a handful of times. Warm and soft. Washed and ready.", 500, "CLOTHING", "LIKE_NEW", 0],
  ["Formal blazer, navy (size 40)", "Used for one placement drive. Dry-cleaned.", 1200, "CLOTHING", "LIKE_NEW", 0],
  ["Badminton racket pair with cover", "Two rackets, one cover and three shuttles. Ready to play.", 800, "OTHER", "GOOD", 0],
  ["Electric kettle, 1.5 litre", "Boils fast. Allowed in most hostels. Cord is in good condition.", 450, "OTHER", "GOOD", 1],
  ["Guitar, acoustic with bag", "Good starter guitar. New strings, bag and a spare pick set.", 2800, "OTHER", "GOOD", 1],
  ["Data Structures notes, handwritten", "Complete semester notes with solved examples. Photocopies available.", 150, "BOOKS", "GOOD", 0, "SOLD"],
  ["Mechanical keyboard, blue switches", "Tactile and loud. Not for shared rooms. Keycaps are clean.", 1700, "ELECTRONICS", "GOOD", 0, "SOLD"],
  ["Bedside storage shelf", "Compact shelf with three tiers. Easy to carry.", 350, "FURNITURE", "GOOD", 0],
];

// A tiny valid PNG per colour so every card has a picture without storing large files.
function png(rgb: [number, number, number]) {
  const w = 240, h = 180;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    for (let x = 0; x < w; x++) {
      const shade = 1 - (y / h) * 0.25;
      raw[row + 1 + x * 3] = rgb[0] * shade;
      raw[row + 2 + x * 3] = rgb[1] * shade;
      raw[row + 3 + x * 3] = rgb[2] * shade;
    }
  }
  return encodePng(w, h, raw);
}
import { deflateSync } from "node:zlib";
function crc(buf: Buffer) {
  let c, crcv = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crcv ^ buf[n]!) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcv = (crcv >>> 8) ^ c;
  }
  return (crcv ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
}
function encodePng(w: number, h: number, raw: Buffer) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const COLOURS: Record<string, [number, number, number]> = {
  BOOKS: [99, 102, 241], ELECTRONICS: [14, 165, 233], FURNITURE: [217, 119, 6],
  CYCLES: [22, 163, 74], CLOTHING: [219, 39, 119], OTHER: [100, 116, 139],
};

async function main() {
  // RESTART IDENTITY makes ids start at 1 again, so links like /listings/1 always work.
  await db.$executeRawUnsafe('TRUNCATE TABLE "Message", "Listing", "User" RESTART IDENTITY CASCADE');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const created = [];
  for (const u of users) created.push(await db.user.create({ data: { ...u, passwordHash } }));
  const [aarav, diya] = created as [typeof created[number], typeof created[number]];
  const day = 24 * 60 * 60 * 1000;
  for (const [i, [title, description, priceRupees, category, condition, owner, status]] of listings.entries()) {
    await db.listing.create({
      data: {
        title, description, priceRupees, category, condition, status: status ?? "AVAILABLE",
        ownerId: owner === 0 ? aarav.id : diya.id,
        imageData: new Uint8Array(png(COLOURS[category]!)), imageType: "image/png",
        createdAt: new Date(Date.now() - i * day * 0.4),
      },
    });
  }
  const first = await db.listing.findFirst({ where: { ownerId: aarav.id }, orderBy: { id: "asc" } });
  if (first) {
    await db.message.createMany({
      data: [
        { listingId: first.id, senderId: diya.id, receiverId: aarav.id, body: "Hi! Is this still available?" },
        { listingId: first.id, senderId: aarav.id, receiverId: diya.id, body: "Yes it is. I can meet near the library at 5." },
      ],
    });
  }
  console.log(`Seeded ${created.length} users and ${listings.length} listings. ${process.env.SEED_PASSWORD ? "Password set from SEED_PASSWORD." : "Seed accounts have a random password."}`);
}
main().finally(() => db.$disconnect());
