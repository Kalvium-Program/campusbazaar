import request from "supertest";
import { describe, expect, it } from "vitest";
import { db } from "../src/db.js";
import { app, createListing, signup } from "./helpers.js";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64");

describe("listings", () => {
  it("logged-out users can browse but not post", async () => {
    expect((await request(app).get("/api/listings")).status).toBe(200);
    const res = await request(app).post("/api/listings").field("title", "x");
    expect(res.status).toBe(401);
  });

  it("creates a listing with a photo and serves the image", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const res = await createListing(agent).attach("photo", png, { filename: "a.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body.listing.hasImage).toBe(true);
    expect(res.body.listing).not.toHaveProperty("imageData");
    const img = await request(app).get(`/api/listings/${res.body.listing.id}/image`);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
    expect(img.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects a non-image upload and an oversized one", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const bad = await createListing(agent).attach("photo", Buffer.from("<script>"), { filename: "a.html", contentType: "text/html" });
    expect(bad.status).toBe(400);
    const big = await createListing(agent).attach("photo", Buffer.alloc(3 * 1024 * 1024), { filename: "b.png", contentType: "image/png" });
    expect(big.status).toBe(413);
  });

  it("validates fields", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const res = await createListing(agent, { title: "x", priceRupees: "-5" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["title", "priceRupees"]));
  });

  it("searches, filters, sorts and paginates", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    for (let i = 1; i <= 5; i++) await createListing(agent, { title: `Book number ${i}`, priceRupees: String(i * 100) });
    await createListing(agent, { title: "Road cycle", category: "CYCLES", priceRupees: "5000" });
    const search = await request(app).get("/api/listings?q=ROAD");
    expect(search.body.items).toHaveLength(1);
    const cat = await request(app).get("/api/listings?category=BOOKS&sort=price_desc&limit=2&page=2");
    expect(cat.body.total).toBe(5);
    expect(cat.body.totalPages).toBe(3);
    expect(cat.body.items.map((l: { priceRupees: number }) => l.priceRupees)).toEqual([300, 200]);
    const range = await request(app).get("/api/listings?minPrice=200&maxPrice=300&category=BOOKS");
    expect(range.body.total).toBe(2);
  });

  it("only the owner can edit or delete; others get 404", async () => {
    const owner = await signup("Asha", "asha@x.com");
    const other = await signup("Ravi", "ravi@x.com");
    const { body } = await createListing(owner.agent);
    const id = body.listing.id;
    expect((await other.agent.delete(`/api/listings/${id}`)).status).toBe(404);
    expect((await other.agent.patch(`/api/listings/${id}`).field("title", "Hacked title")).status).toBe(404);
    expect((await owner.agent.patch(`/api/listings/${id}`).field("status", "SOLD")).body.listing.status).toBe("SOLD");
    expect((await owner.agent.delete(`/api/listings/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/listings/${id}`)).status).toBe(404);
  });

  it("an admin can remove any listing", async () => {
    const owner = await signup("Asha", "asha@x.com");
    const admin = await signup("Boss", "boss@x.com");
    await db.user.update({ where: { id: admin.user.id }, data: { role: "ADMIN" } });
    const { body } = await createListing(owner.agent);
    expect((await admin.agent.delete(`/api/listings/${body.listing.id}`)).status).toBe(204);
  });

  it("unknown ids and routes give the same error shape", async () => {
    expect((await request(app).get("/api/listings/999999")).body.error.code).toBe("NOT_FOUND");
    expect((await request(app).get("/api/listings/abc")).status).toBe(400);
    expect((await request(app).get("/api/nope")).body.error.code).toBe("NOT_FOUND");
  });
});
