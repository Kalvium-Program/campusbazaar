import { Router } from "express";
import { z } from "zod";
import { COOKIE, cookieOptions, hashPassword, requireAuth, signToken, verifyPassword } from "../auth.js";
import { db } from "../db.js";
import { HttpError } from "../errors.js";
import { clientIp, rateLimit } from "../rateLimit.js";

export const authRouter = Router();

const signupBody = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});
const loginBody = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

// Signup: per visitor. Login: per email, so guessing one password is slow but a busy campus network is fine.
const signupLimiter = rateLimit(15, 10 * 60_000, clientIp);
const loginLimiter = rateLimit(10, 5 * 60_000, (req) => `${String(req.body?.email ?? "").toLowerCase()}|${clientIp(req)}`);
const publicUser = { id: true, name: true, email: true, role: true } as const;

authRouter.post("/signup", signupLimiter, async (req, res) => {
  const body = signupBody.parse(req.body);
  const exists = await db.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "EMAIL_TAKEN", "That email is already registered", { email: "Already registered" });
  const user = await db.user.create({
    data: { name: body.name, email: body.email, passwordHash: await hashPassword(body.password) },
    select: publicUser,
  });
  res.cookie(COOKIE, signToken(user.id), cookieOptions).status(201).json({ user });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const body = loginBody.parse(req.body);
  const row = await db.user.findUnique({ where: { email: body.email } });
  // Same message for "no such email" and "wrong password": never say which one.
  const ok = row ? await verifyPassword(body.password, row.passwordHash) : false;
  if (!row || !ok) throw new HttpError(401, "BAD_LOGIN", "Wrong email or password");
  res
    .cookie(COOKIE, signToken(row.id), cookieOptions)
    .json({ user: { id: row.id, name: row.name, email: row.email, role: row.role } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined }).json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));
