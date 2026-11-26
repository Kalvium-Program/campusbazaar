import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, createListing, signup } from "./helpers.js";

describe("favorites, views, similar", () => {
  it("saves, lists and unsaves a listing; repeating is safe", async () => {
    const { agent: seller } = await signup("Asha", "asha@x.com");
    const { agent: buyer } = await signup("Ravi", "ravi@x.com");
    const id = (await createListing(seller)).body.listing.id;

    expect((await request(app).put(`/api/listings/${id}/favorite`)).status).toBe(401);
    expect((await buyer.put(`/api/listings/${id}/favorite`)).status).toBe(204);
    expect((await buyer.put(`/api/listings/${id}/favorite`)).status).toBe(204);
    expect((await buyer.get("/api/listings/saved/mine")).body.items.map((l: { id: number }) => l.id)).toEqual([id]);
    expect((await request(app).get(`/api/listings/${id}`)).body.listing.saves).toBe(1);

    expect((await buyer.delete(`/api/listings/${id}/favorite`)).status).toBe(204);
    expect((await buyer.get("/api/listings/saved/mine")).body.items).toEqual([]);
    expect((await buyer.put("/api/listings/999999/favorite")).status).toBe(404);
  });

  it("counts views from others but not from the seller", async () => {
    const { agent: seller } = await signup("Asha", "asha@x.com");
    const id = (await createListing(seller)).body.listing.id;
    await seller.get(`/api/listings/${id}`);
    await request(app).get(`/api/listings/${id}`);
    const res = await request(app).get(`/api/listings/${id}`);
    expect(res.body.listing.views).toBe(2);
  });

  it("returns similar available listings from the same category", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const a = (await createListing(agent, { priceRupees: "300" })).body.listing.id;
    const near = (await createListing(agent, { priceRupees: "350" })).body.listing.id;
    await createListing(agent, { category: "CYCLES" });
    const res = await request(app).get(`/api/listings/${a}/similar`);
    expect(res.body.items.map((l: { id: number }) => l.id)).toEqual([near]);
  });

  it("sorts by popularity", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const first = (await createListing(agent)).body.listing.id;
    const second = (await createListing(agent)).body.listing.id;
    await request(app).get(`/api/listings/${first}`);
    const res = await request(app).get("/api/listings?sort=popular");
    expect(res.body.items[0].id).toBe(first);
    expect(res.body.items[1].id).toBe(second);
  });
});
