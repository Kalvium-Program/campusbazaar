import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, createListing, signup } from "./helpers.js";

describe("messages and chat ticket", () => {
  it("buyer and seller can talk about a listing", async () => {
    const seller = await signup("Asha", "asha@x.com");
    const buyer = await signup("Ravi", "ravi@x.com");
    const { body } = await createListing(seller.agent);
    const id = body.listing.id;

    const sent = await buyer.agent.post(`/api/listings/${id}/messages`).send({ body: "Is it available?" });
    expect(sent.status).toBe(201);

    const sellerView = await seller.agent.get(`/api/listings/${id}/messages?with=${buyer.user.id}`);
    expect(sellerView.body.messages).toHaveLength(1);
    const reply = await seller.agent.post(`/api/listings/${id}/messages`).send({ body: "Yes!", to: buyer.user.id });
    expect(reply.status).toBe(201);

    const inbox = await buyer.agent.get("/api/conversations");
    expect(inbox.body.conversations).toHaveLength(1);
    expect(inbox.body.conversations[0].last.body).toBe("Yes!");
  });

  it("a third user cannot read someone else's thread", async () => {
    const seller = await signup("Asha", "asha@x.com");
    const buyer = await signup("Ravi", "ravi@x.com");
    const spy = await signup("Spy", "spy@x.com");
    const { body } = await createListing(seller.agent);
    await buyer.agent.post(`/api/listings/${body.listing.id}/messages`).send({ body: "secret" });
    const res = await spy.agent.get(`/api/listings/${body.listing.id}/messages`);
    expect(res.body.messages).toHaveLength(0);
  });

  it("you cannot message yourself, and logged-out users are refused", async () => {
    const seller = await signup("Asha", "asha@x.com");
    const { body } = await createListing(seller.agent);
    const res = await seller.agent.post(`/api/listings/${body.listing.id}/messages`).send({ body: "hi", to: seller.user.id });
    expect(res.status).toBe(400);
    expect((await request(app).get("/api/conversations")).status).toBe(401);
    expect((await request(app).post("/api/chat/ticket")).status).toBe(401);
  });

  it("issues a ticket for a logged-in user", async () => {
    const { agent } = await signup("Asha", "asha@x.com");
    const res = await agent.post("/api/chat/ticket");
    expect(res.body.ticket).toMatch(/^[a-f0-9]{48}$/);
  });
});
