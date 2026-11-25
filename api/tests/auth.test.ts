import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, signup } from "./helpers.js";

describe("auth", () => {
  it("signs up, sets an HttpOnly cookie and never returns the hash", async () => {
    const res = await request(app).post("/api/auth/signup").send({ name: "Asha", email: "Asha@x.com", password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(Number), name: "Asha", email: "asha@x.com", role: "USER" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/cb_token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("rejects bad input with field errors", async () => {
    const res = await request(app).post("/api/auth/signup").send({ name: "A", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("returns 409 for a duplicate email", async () => {
    await signup("Asha", "asha@x.com");
    const res = await request(app).post("/api/auth/signup").send({ name: "Other", email: "asha@x.com", password: "password123" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("login gives the same error for a wrong password and an unknown email", async () => {
    await signup("Asha", "asha@x.com");
    const wrong = await request(app).post("/api/auth/login").send({ email: "asha@x.com", password: "wrongwrong" });
    const unknown = await request(app).post("/api/auth/login").send({ email: "who@x.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("/me needs the cookie, and logout clears it", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const { agent } = await signup("Asha", "asha@x.com");
    expect((await agent.get("/api/auth/me")).body.user.email).toBe("asha@x.com");
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("a tampered token is rejected", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "cb_token=abc.def.ghi");
    expect(res.status).toBe(401);
  });
});
