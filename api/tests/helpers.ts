import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function signup(name: string, email: string, password = "password123") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/signup").send({ name, email, password });
  return { agent, user: res.body.user as { id: number; email: string; role: string } };
}

export const listingBody = {
  title: "Calculus textbook",
  description: "Good condition, no highlights at all.",
  priceRupees: "300",
  category: "BOOKS",
  condition: "GOOD",
};

export function createListing(agent: ReturnType<typeof request.agent>, over: Record<string, string> = {}) {
  const req = agent.post("/api/listings");
  for (const [k, v] of Object.entries({ ...listingBody, ...over })) req.field(k, v);
  return req;
}
